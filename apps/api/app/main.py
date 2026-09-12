"""
Point d'entrée FastAPI — câblage de la base uniquement.

La logique agent (appels Exa, LLM, envoi WhatsApp) n'est PAS ici : elle
consomme `crud.py`. Cette couche ne fait que ouvrir/fermer les sessions.

    uvicorn app.main:app --reload
"""

from __future__ import annotations

from contextlib import asynccontextmanager

import os

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from . import crud
from .db import get_session, init_db, ping
from .models import Role, TypeRessource
from .schemas import (
    ContexteOut,
    HealthOut,
    MessageAck,
    MessageCreate,
    MessageOut,
    ProfilCreate,
    ProfilOut,
    ProfilUpdate,
    RappelCreate,
    RappelOut,
    RecommandationCreate,
    RecommandationOut,
    RessourceOut,
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Oriente AI — API", version="0.1.0", lifespan=lifespan)

# ──────────────────────────── CORS ────────────────────────────
#
# Sans ça, le frontend Vite (http://localhost:5173) ne peut PAS appeler cette
# API : le navigateur bloque la requête avant même qu'elle parte, et l'erreur
# n'apparaît que dans la console — le serveur, lui, ne voit rien.
#
# Le bot WhatsApp n'en a pas besoin (Node n'applique pas la politique
# same-origin), c'est uniquement pour le navigateur.
#
# CORS_ORIGINS="http://localhost:5173,http://192.168.1.42:5173" pour surcharger.
_origines = os.getenv("CORS_ORIGINS")
app.add_middleware(
    CORSMiddleware,
    allow_origins=(
        [o.strip() for o in _origines.split(",") if o.strip()]
        if _origines
        else [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:4173",  # vite preview
        ]
    ),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────── santé ────────────────────────────


@app.get("/health", response_model=HealthOut)
async def health() -> HealthOut:
    """Le rubric demande de montrer une erreur gérée. Coupe la base pendant la
    démo et montre que l'app le détecte au lieu de planter."""
    ok = await ping()
    return HealthOut(status="ok" if ok else "degraded", database=ok)


# ──────────────────────────── profils ────────────────────────────


@app.post("/profils", response_model=ProfilOut)
async def creer_profil(
    payload: ProfilCreate, session: AsyncSession = Depends(get_session)
) -> ProfilOut:
    """Création depuis la landing page. Idempotent : renvoyer le formulaire
    avec le même numéro met à jour le profil au lieu d'échouer.

    Cette route enregistrait autrefois uniquement whatsapp_id et nom, et
    perdait silencieusement ville, objectif, intérêts et CV. Elle persiste
    maintenant tout ce que le formulaire envoie."""
    profil, _ = await crud.get_or_create_profil(
        session, payload.whatsapp_id, payload.nom
    )
    champs = payload.model_dump(exclude={"whatsapp_id"}, exclude_unset=True)
    if champs:
        profil = await crud.maj_profil(session, profil, **champs)
    return ProfilOut.model_validate(profil)


@app.get("/profils/{whatsapp_id}", response_model=ProfilOut)
async def lire_profil(
    whatsapp_id: str, session: AsyncSession = Depends(get_session)
) -> ProfilOut:
    profil, cree = await crud.get_or_create_profil(session, whatsapp_id)
    if cree:
        raise HTTPException(404, "Profil inexistant")
    return ProfilOut.model_validate(profil)


@app.patch("/profils/{whatsapp_id}", response_model=ProfilOut)
async def modifier_profil(
    whatsapp_id: str,
    payload: ProfilUpdate,
    session: AsyncSession = Depends(get_session),
) -> ProfilOut:
    profil, _ = await crud.get_or_create_profil(session, whatsapp_id)
    profil = await crud.maj_profil(
        session, profil, **payload.model_dump(exclude_unset=True)
    )
    return ProfilOut.model_validate(profil)


# ──────────────────────────── conversation ────────────────────────────


@app.get("/profils/{whatsapp_id}/messages", response_model=list[MessageOut])
async def lire_historique(
    whatsapp_id: str,
    limit: int = 20,
    session: AsyncSession = Depends(get_session),
) -> list[MessageOut]:
    profil, _ = await crud.get_or_create_profil(session, whatsapp_id)
    msgs = await crud.historique(session, profil.id, limit)
    return [MessageOut.model_validate(m) for m in msgs]


# ──────────────────────────── ressources & recos ────────────────────────────


@app.get("/ressources", response_model=list[RessourceOut])
async def lister_ressources(
    type: TypeRessource | None = None,
    ville: str | None = None,
    limit: int = 20,
    session: AsyncSession = Depends(get_session),
) -> list[RessourceOut]:
    items = await crud.chercher_ressources(
        session, type=type, ville=ville, limit=limit
    )
    return [RessourceOut.model_validate(r) for r in items]


@app.get(
    "/profils/{whatsapp_id}/recommandations", response_model=list[RecommandationOut]
)
async def lire_recos(
    whatsapp_id: str,
    type: TypeRessource | None = None,
    limit: int = 5,
    session: AsyncSession = Depends(get_session),
) -> list[RecommandationOut]:
    profil, _ = await crud.get_or_create_profil(session, whatsapp_id)
    recos = await crud.recos_du_profil(session, profil.id, type=type, limit=limit)
    return [RecommandationOut.model_validate(r) for r in recos]


# ──────────────────────────── rappels ────────────────────────────


@app.post("/profils/{whatsapp_id}/rappels", response_model=RappelOut)
async def creer_rappel(
    whatsapp_id: str,
    payload: RappelCreate,
    session: AsyncSession = Depends(get_session),
) -> RappelOut:
    profil, _ = await crud.get_or_create_profil(session, whatsapp_id)
    rappel = await crud.programmer_rappel(
        session,
        profil.id,
        payload.libelle,
        payload.date_rappel,
        payload.ressource_id,
    )
    return RappelOut.model_validate(rappel)


# ──────────────────────────── écriture depuis le bot ────────────────────────
#
# Il n'y a PAS de webhook ici. Le bot utilise whatsapp-web.js, qui reçoit les
# messages en direct dans son propre process — pas de callback HTTP entrant,
# donc pas de contrainte d'acquittement Meta. Cette API est appelée *par* le
# bot, jamais par WhatsApp.


@app.post("/profils/{whatsapp_id}/messages", response_model=MessageAck)
async def enregistrer_message(
    whatsapp_id: str,
    payload: MessageCreate,
    session: AsyncSession = Depends(get_session),
) -> MessageAck:
    """Enregistre un message. `duplicate=true` -> le bot ne répond pas.

    whatsapp-web.js peut relivrer un message après une reconnexion. Passe
    `message.id._serialized` en `wa_message_id` et le doublon est absorbé ici."""
    profil, _ = await crud.get_or_create_profil(session, whatsapp_id)
    msg = await crud.add_message(
        session,
        profil.id,
        payload.role,
        payload.contenu,
        wa_message_id=payload.wa_message_id,
    )
    if msg is None:
        return MessageAck(duplicate=True)
    return MessageAck(duplicate=False, message=MessageOut.model_validate(msg))


@app.post(
    "/profils/{whatsapp_id}/recommandations", response_model=RecommandationOut
)
async def enregistrer_reco(
    whatsapp_id: str,
    payload: RecommandationCreate,
    session: AsyncSession = Depends(get_session),
) -> RecommandationOut:
    profil, _ = await crud.get_or_create_profil(session, whatsapp_id)
    reco = await crud.recommander(
        session,
        profil.id,
        payload.ressource_id,
        payload.score,
        payload.justification,
    )
    recos = await crud.recos_du_profil(session, profil.id, limit=50)
    courante = next((r for r in recos if r.id == reco.id), None)
    if courante is None:
        raise HTTPException(404, "Ressource inexistante")
    return RecommandationOut.model_validate(courante)


# ──────────────────────────── contexte (1 appel) ────────────────────────────


@app.get("/profils/{whatsapp_id}/contexte", response_model=ContexteOut)
async def contexte(
    whatsapp_id: str,
    nom: str | None = None,
    limit_historique: int = 12,
    limit_ressources: int = 20,
    session: AsyncSession = Depends(get_session),
) -> ContexteOut:
    """Profil + historique + catalogue + recos en une seule requête.

    C'est l'endpoint que le bot appelle à chaque message. Trois allers-retours
    HTTP séparés se voient sur WhatsApp ; celui-ci n'en fait qu'un."""
    profil, _ = await crud.get_or_create_profil(session, whatsapp_id, nom)

    # Quota PAR TYPE, pas une limite plate.
    #
    # Avec un simple `limit` trié par date, le type le plus nombreux mange tout
    # le contexte : le seed insère 13 débouchés après 4 filières, et l'agent ne
    # voyait plus une seule filière. Un test l'a montré.
    types = [
        TypeRessource.filiere,
        TypeRessource.formation,
        TypeRessource.offre,
        TypeRessource.debouche,
        TypeRessource.evenement,
    ]
    quota = max(2, limit_ressources // len(types))

    ressources = []
    for t in types:
        lot = await crud.chercher_ressources(
            session, type=t, ville=profil.ville, limit=quota
        )
        if not lot and profil.ville:
            # Rien dans sa ville pour ce type : on retombe sur le national.
            lot = await crud.chercher_ressources(session, type=t, limit=quota)
        ressources.extend(lot)

    return ContexteOut(
        profil=ProfilOut.model_validate(profil),
        historique=[
            MessageOut.model_validate(m)
            for m in await crud.historique(session, profil.id, limit_historique)
        ],
        ressources=[RessourceOut.model_validate(r) for r in ressources],
        recommandations=[
            RecommandationOut.model_validate(r)
            for r in await crud.recos_du_profil(session, profil.id, limit=5)
        ],
    )
