"""
Opérations base de données. Tout ce que le bot appelle passe par ici —
aucune requête SQLAlchemy dans les routes ou dans la logique agent.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from .models import (
    Message,
    Profil,
    Rappel,
    Recommandation,
    Ressource,
    Role,
    StatutReco,
    Track,
    TypeRessource,
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ──────────────────────────── profil ────────────────────────────


async def get_or_create_profil(
    session: AsyncSession, whatsapp_id: str, nom: str | None = None
) -> tuple[Profil, bool]:
    """Retourne (profil, cree). Premier point d'entrée de chaque webhook."""
    res = await session.execute(select(Profil).where(Profil.whatsapp_id == whatsapp_id))
    profil = res.scalar_one_or_none()
    if profil is not None:
        return profil, False

    profil = Profil(whatsapp_id=whatsapp_id, nom=nom)
    try:
        # Savepoint : voir la note dans add_message. Deux webhooks du même
        # utilisateur en parallèle -> le perdant relit au lieu de casser.
        async with session.begin_nested():
            session.add(profil)
    except IntegrityError:
        res = await session.execute(
            select(Profil).where(Profil.whatsapp_id == whatsapp_id)
        )
        return res.scalar_one(), False
    await session.commit()
    return profil, True


async def maj_profil(session: AsyncSession, profil: Profil, **champs) -> Profil:
    """Mise à jour partielle. Ignore les clés inconnues plutôt que de planter
    — l'extraction LLM renvoie parfois des champs inventés."""
    autorises = {
        "nom",
        "ville",
        "niveau",
        "track",
        "interets",
        "cv_summary",
        "langue",
        "onboarding_complet",
    }
    for cle, valeur in champs.items():
        if cle in autorises and valeur is not None:
            if cle == "track" and not isinstance(valeur, Track):
                try:
                    valeur = Track(valeur)
                except ValueError:
                    continue
            setattr(profil, cle, valeur)
    await session.commit()
    return profil


# ──────────────────────────── messages ────────────────────────────


async def add_message(
    session: AsyncSession,
    profil_id: str,
    role: Role,
    contenu: str,
    wa_message_id: str | None = None,
) -> Message | None:
    """Retourne None si wa_message_id a déjà été traité.

    C'est ta garde d'idempotence : `if await add_message(...) is None: return`
    en tête de webhook et un rejeu Meta ne produit plus de réponse en double.
    """
    msg = Message(
        profil_id=profil_id, role=role, contenu=contenu, wa_message_id=wa_message_id
    )
    # SAVEPOINT, pas un commit direct.
    #
    # Piège async : session.rollback() expire TOUS les objets de la session,
    # y compris le Profil chargé plus tôt. L'accès suivant à profil.id
    # déclenche alors un refresh lazy hors greenlet -> MissingGreenlet, à
    # l'appel d'après, très loin de la vraie cause. Le savepoint annule
    # uniquement l'insert en conflit et laisse la session intacte.
    try:
        async with session.begin_nested():
            session.add(msg)
    except IntegrityError:
        return None
    await session.commit()
    return msg


async def historique(
    session: AsyncSession, profil_id: str, limit: int = 20
) -> list[Message]:
    """Les `limit` derniers messages, dans l'ordre chronologique (prêt pour le LLM)."""
    res = await session.execute(
        select(Message)
        .where(Message.profil_id == profil_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    return list(reversed(res.scalars().all()))


# ──────────────────────────── ressources ────────────────────────────


async def upsert_ressource(
    session: AsyncSession,
    *,
    type: TypeRessource,
    titre: str,
    url: str | None = None,
    organisation: str | None = None,
    ville: str | None = None,
    secteur: str | None = None,
    description: str | None = None,
    meta: dict | None = None,
    source: str = "exa",
    date_expiration: datetime | None = None,
) -> Ressource:
    """Déduplique sur (type, url) : Exa renvoie la même page sur plusieurs
    requêtes. Sans ça ta table gonfle et l'utilisateur voit des doublons."""
    if url:
        res = await session.execute(
            select(Ressource).where(Ressource.type == type, Ressource.url == url)
        )
        existante = res.scalar_one_or_none()
        if existante is not None:
            existante.titre = titre or existante.titre
            existante.description = description or existante.description
            existante.organisation = organisation or existante.organisation
            existante.ville = ville or existante.ville
            existante.secteur = secteur or existante.secteur
            if meta:
                existante.meta = {**(existante.meta or {}), **meta}
            existante.date_fetch = _now()
            if date_expiration:
                existante.date_expiration = date_expiration
            await session.commit()
            return existante

    ressource = Ressource(
        type=type,
        titre=titre,
        url=url,
        organisation=organisation,
        ville=ville,
        secteur=secteur,
        description=description,
        meta=meta or {},
        source=source,
        date_expiration=date_expiration,
    )
    session.add(ressource)
    await session.commit()
    return ressource


async def chercher_ressources(
    session: AsyncSession,
    *,
    type: TypeRessource | None = None,
    ville: str | None = None,
    inclure_sans_ville: bool = True,
    inclure_expirees: bool = False,
    limit: int = 20,
) -> list[Ressource]:
    """`inclure_sans_ville` : un débouché métier n'a pas de ville. Filtrer
    strictement sur la ville les ferait tous disparaître du contexte — c'est
    le défaut qu'un test a révélé. Passe False pour un filtre géographique dur."""
    req = select(Ressource)
    if type is not None:
        req = req.where(Ressource.type == type)
    if ville:
        req = (
            req.where((Ressource.ville == ville) | (Ressource.ville.is_(None)))
            if inclure_sans_ville
            else req.where(Ressource.ville == ville)
        )
    if not inclure_expirees:
        req = req.where(
            (Ressource.date_expiration.is_(None)) | (Ressource.date_expiration > _now())
        )
    req = req.order_by(Ressource.date_fetch.desc()).limit(limit)
    res = await session.execute(req)
    return list(res.scalars().all())


# ──────────────────────────── recommandations ────────────────────────────


async def recommander(
    session: AsyncSession,
    profil_id: str,
    ressource_id: str,
    score: float,
    justification: str | None = None,
) -> Recommandation:
    """Idempotent : re-recommander la même ressource met à jour le score."""
    res = await session.execute(
        select(Recommandation).where(
            Recommandation.profil_id == profil_id,
            Recommandation.ressource_id == ressource_id,
        )
    )
    reco = res.scalar_one_or_none()
    if reco is not None:
        reco.score = score
        if justification:
            reco.justification = justification
        await session.commit()
        return reco

    reco = Recommandation(
        profil_id=profil_id,
        ressource_id=ressource_id,
        score=score,
        justification=justification,
    )
    session.add(reco)
    await session.commit()
    return reco


async def recos_du_profil(
    session: AsyncSession,
    profil_id: str,
    type: TypeRessource | None = None,
    limit: int = 5,
) -> list[Recommandation]:
    """Chargement eager de `ressource` (lazy="selectin" sur la relation) :
    tu peux lire reco.ressource.titre après la fermeture de session."""
    req = (
        select(Recommandation)
        .join(Ressource)
        .where(Recommandation.profil_id == profil_id)
    )
    if type is not None:
        req = req.where(Ressource.type == type)
    req = req.order_by(Recommandation.score.desc()).limit(limit)
    res = await session.execute(req)
    return list(res.scalars().all())


async def marquer_statut(
    session: AsyncSession, reco_id: str, statut: StatutReco
) -> Recommandation | None:
    reco = await session.get(Recommandation, reco_id)
    if reco is None:
        return None
    reco.statut = statut
    await session.commit()
    return reco


# ──────────────────────────── rappels ────────────────────────────


async def programmer_rappel(
    session: AsyncSession,
    profil_id: str,
    libelle: str,
    date_rappel: datetime,
    ressource_id: str | None = None,
) -> Rappel:
    rappel = Rappel(
        profil_id=profil_id,
        libelle=libelle,
        date_rappel=date_rappel,
        ressource_id=ressource_id,
    )
    session.add(rappel)
    await session.commit()
    return rappel


async def rappels_a_envoyer(
    session: AsyncSession, maintenant: datetime | None = None, limit: int = 50
) -> list[Rappel]:
    """Ce que le scheduler appelle en boucle. Utilise ix_rappel_a_envoyer."""
    maintenant = maintenant or _now()
    res = await session.execute(
        select(Rappel)
        .where(Rappel.envoye.is_(False), Rappel.date_rappel <= maintenant)
        .order_by(Rappel.date_rappel)
        .limit(limit)
    )
    return list(res.scalars().all())


async def marquer_rappel_envoye(session: AsyncSession, rappel_id: str) -> None:
    rappel = await session.get(Rappel, rappel_id)
    if rappel is not None:
        rappel.envoye = True
        rappel.date_envoi = _now()
        await session.commit()
