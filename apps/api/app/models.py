"""
Modèle de données Oriente AI — version hackathon.

Écarts assumés par rapport à l'ERD initial, et pourquoi :

1. UTILISATEUR + PROFIL fusionnés en `Profil`.
   La relation était 1:1, le split ne payait rien et dupliquait whatsapp_id.

2. `Message` ajouté. C'était le trou bloquant de l'ERD : un bot WhatsApp sans
   historique n'a pas de contexte multi-tour et est indébuggable en démo.
   `wa_message_id` est UNIQUE : Meta rejoue les webhooks, cette contrainte est
   ce qui t'évite de traiter deux fois le même message.

3. FILIERE + FORMATION + OFFRE + DEBOUCHE fusionnées en `Ressource`.
   Les quatre avaient la même forme (un titre, un organisme, une URL, une
   description). Un discriminant `type` + une colonne `meta` JSON couvre les
   différences (durée, salaire, université, entreprise). 4 tables -> 1, et la
   FK de Recommandation devient simple au lieu de polymorphe.

4. `Recommandation` ajoutée : la table de jonction qui manquait sous les
   relations N-N `recommande`. C'est ici que vit la valeur produit — le score,
   la justification, le statut. Sans elle tu ne peux pas répondre au jury
   « pourquoi ce résultat pour cet utilisateur ».

5. `Rappel` remplace EVENT_REMINDER sans Google Calendar : `calendar_event_id`
   est supprimé. On garde la valeur perçue (le rappel arrive sur WhatsApp) en
   supprimant l'intégration OAuth la plus coûteuse du projet.

6. `salaire_estime` n'a pas de colonne dédiée : il vit dans `meta` et doit
   toujours être accompagné de sa source. Aucune source fiable indexée de
   salaires marocains — ne laisse pas un LLM inventer un chiffre nu.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


# ──────────────────────────── énumérations ────────────────────────────


class Track(str, enum.Enum):
    """Le binaire académique/professionnel de l'ERD ratait deux cas réels :
    l'étudiant qui cherche un stage, et le profil encore indéterminé."""

    academique = "academique"
    professionnel = "professionnel"
    insertion = "insertion"  # stage / premier emploi
    inconnu = "inconnu"


class TypeRessource(str, enum.Enum):
    filiere = "filiere"
    formation = "formation"
    offre = "offre"
    debouche = "debouche"
    evenement = "evenement"


class Role(str, enum.Enum):
    user = "user"
    assistant = "assistant"
    system = "system"


class StatutReco(str, enum.Enum):
    proposee = "proposee"
    vue = "vue"
    retenue = "retenue"
    rejetee = "rejetee"


# ──────────────────────────── tables ────────────────────────────


class Profil(Base):
    __tablename__ = "profil"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    whatsapp_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)

    nom: Mapped[str | None] = mapped_column(String(120), default=None)
    ville: Mapped[str | None] = mapped_column(String(80), default=None)
    niveau: Mapped[str | None] = mapped_column(String(80), default=None)  # "Bac+2", "Licence 3"
    track: Mapped[Track] = mapped_column(Enum(Track), default=Track.inconnu)

    # Liste, pas une chaîne CSV : l'ERD typait `interets` en string, ce qui
    # t'obligeait à parser à chaque lecture.
    interets: Mapped[list] = mapped_column(JSON, default=list)

    cv_summary: Mapped[str | None] = mapped_column(Text, default=None)
    langue: Mapped[str] = mapped_column(String(8), default="fr")
    onboarding_complet: Mapped[bool] = mapped_column(Boolean, default=False)

    date_creation: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    date_maj: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now
    )

    # Pas de collections `profil.messages` / `.recommandations` / `.rappels`.
    #
    # En SQLAlchemy async, ajouter un enfant dont le parent est déjà en session
    # fait charger la collection du parent pour y insérer l'objet — un lazy load
    # hors greenlet, donc MissingGreenlet au premier add_message(). Les
    # collections côté parent sont un piège en async.
    #
    # On lit via crud.historique() / crud.recos_du_profil(), et la suppression en
    # cascade est assurée par la base (ondelete="CASCADE" + PRAGMA foreign_keys=ON
    # dans db.py), pas par l'ORM.

    def __repr__(self) -> str:
        return f"<Profil {self.whatsapp_id} track={self.track.value}>"


class Message(Base):
    """Historique de conversation. Sans cette table, pas de contexte multi-tour."""

    __tablename__ = "message"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    profil_id: Mapped[str] = mapped_column(
        ForeignKey("profil.id", ondelete="CASCADE"), index=True
    )

    role: Mapped[Role] = mapped_column(Enum(Role))
    contenu: Mapped[str] = mapped_column(Text)

    # Idempotence webhook. Meta rejoue un webhook non acquitté dans les temps :
    # sans cet unique, l'utilisateur reçoit deux réponses.
    wa_message_id: Mapped[str | None] = mapped_column(
        String(128), unique=True, default=None
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    __table_args__ = (Index("ix_message_profil_date", "profil_id", "created_at"),)


class Ressource(Base):
    """Tout ce qu'on peut recommander : filière, formation, offre, débouché, événement."""

    __tablename__ = "ressource"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    type: Mapped[TypeRessource] = mapped_column(Enum(TypeRessource), index=True)

    titre: Mapped[str] = mapped_column(String(300))
    organisation: Mapped[str | None] = mapped_column(String(200), default=None)  # université | entreprise
    ville: Mapped[str | None] = mapped_column(String(80), default=None)
    secteur: Mapped[str | None] = mapped_column(String(120), default=None)
    description: Mapped[str | None] = mapped_column(Text, default=None)

    # Toujours affichée à l'utilisateur : c'est ce qui distingue une
    # recommandation sourcée d'une hallucination.
    url: Mapped[str | None] = mapped_column(String(600), default=None)

    # duree, salaire_estime + sa source, date_limite, niveau_requis, modules…
    meta: Mapped[dict] = mapped_column(JSON, default=dict)

    source: Mapped[str] = mapped_column(String(32), default="exa")  # exa | seed | manuel
    date_fetch: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    # Les offres périment. Exa renvoie beaucoup d'annonces mortes — filtre dessus.
    date_expiration: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )

    __table_args__ = (
        UniqueConstraint("type", "url", name="uq_ressource_type_url"),
        Index("ix_ressource_type_ville", "type", "ville"),
    )

    def __repr__(self) -> str:
        return f"<Ressource {self.type.value} {self.titre[:40]!r}>"


class Recommandation(Base):
    """Table de jonction PROFIL <-> RESSOURCE. C'est le cœur produit."""

    __tablename__ = "recommandation"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    profil_id: Mapped[str] = mapped_column(
        ForeignKey("profil.id", ondelete="CASCADE"), index=True
    )
    ressource_id: Mapped[str] = mapped_column(
        ForeignKey("ressource.id", ondelete="CASCADE"), index=True
    )

    score: Mapped[float] = mapped_column(Float, default=0.0)
    # La réponse à « pourquoi tu me recommandes ça ? ». Une phrase, générée
    # avec la reco, stockée avec elle. Ne la régénère pas à l'affichage.
    justification: Mapped[str | None] = mapped_column(Text, default=None)
    statut: Mapped[StatutReco] = mapped_column(Enum(StatutReco), default=StatutReco.proposee)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    # Many-to-one eager : sûr en async, et c'est ce qui permet de lire
    # reco.ressource.titre après la fermeture de la session.
    ressource: Mapped[Ressource] = relationship(lazy="selectin")

    __table_args__ = (
        UniqueConstraint("profil_id", "ressource_id", name="uq_reco_profil_ressource"),
        Index("ix_reco_profil_score", "profil_id", "score"),
    )


class Rappel(Base):
    """Push proactif — sans Google Calendar. Un scheduler lit cette table."""

    __tablename__ = "rappel"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    profil_id: Mapped[str] = mapped_column(
        ForeignKey("profil.id", ondelete="CASCADE"), index=True
    )
    ressource_id: Mapped[str | None] = mapped_column(
        ForeignKey("ressource.id", ondelete="SET NULL"), default=None
    )

    libelle: Mapped[str] = mapped_column(String(400))
    date_rappel: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)

    envoye: Mapped[bool] = mapped_column(Boolean, default=False)
    date_envoi: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )

    # L'index que le scheduler interroge en boucle.
    __table_args__ = (Index("ix_rappel_a_envoyer", "envoye", "date_rappel"),)
