"""Schémas Pydantic — frontière HTTP. Ne renvoie jamais un modèle SQLAlchemy
directement : tu exposerais des colonnes internes et tu déclencherais des
chargements lazy hors session."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from .models import Role, StatutReco, Track, TypeRessource

_orm = ConfigDict(from_attributes=True)


# ──────────────────────────── profil ────────────────────────────


class ProfilBase(BaseModel):
    nom: str | None = None
    ville: str | None = None
    niveau: str | None = None
    track: Track = Track.inconnu
    # Texte libre saisi par la personne (« un master au Canada »).
    # Ne pas confondre avec `track`, qui est une énumération interne.
    objectif: str | None = None
    interets: list[str] = Field(default_factory=list)
    cv_summary: str | None = None
    langue: str = "fr"


class ProfilCreate(ProfilBase):
    whatsapp_id: str


class ProfilUpdate(BaseModel):
    """Tous les champs optionnels — c'est ce que l'extraction LLM produit."""

    nom: str | None = None
    ville: str | None = None
    niveau: str | None = None
    track: Track | None = None
    objectif: str | None = None
    interets: list[str] | None = None
    cv_summary: str | None = None
    onboarding_complet: bool | None = None


class ProfilOut(ProfilBase):
    model_config = _orm

    id: str
    whatsapp_id: str
    onboarding_complet: bool
    date_creation: datetime


# ──────────────────────────── messages ────────────────────────────


class MessageCreate(BaseModel):
    role: Role
    contenu: str
    # whatsapp-web.js : message.id._serialized. Garantit qu'un message rejoué
    # après une reconnexion n'est pas traité deux fois.
    wa_message_id: str | None = None


class MessageOut(BaseModel):
    model_config = _orm

    id: str
    role: Role
    contenu: str
    created_at: datetime


class MessageAck(BaseModel):
    """`duplicate=True` -> le bot doit s'arrêter là, sans répondre."""

    duplicate: bool
    message: MessageOut | None = None


# ──────────────────────────── ressources ────────────────────────────


class RessourceOut(BaseModel):
    model_config = _orm

    id: str
    type: TypeRessource
    titre: str
    organisation: str | None = None
    ville: str | None = None
    secteur: str | None = None
    description: str | None = None
    url: str | None = None
    meta: dict = Field(default_factory=dict)
    source: str
    date_fetch: datetime
    date_expiration: datetime | None = None


# ──────────────────────────── recommandations ────────────────────────────


class RecommandationCreate(BaseModel):
    ressource_id: str
    score: float = 0.0
    justification: str | None = None


class RecommandationOut(BaseModel):
    model_config = _orm

    id: str
    score: float
    justification: str | None = None
    statut: StatutReco
    created_at: datetime
    ressource: RessourceOut


class ContexteOut(BaseModel):
    """Tout ce qu'il faut pour construire le prompt, en UN appel.

    Trois requêtes HTTP séparées depuis le bot ajoutent de la latence à chaque
    message WhatsApp. Celle-ci les regroupe."""

    profil: "ProfilOut"
    historique: list[MessageOut]
    ressources: list[RessourceOut]
    recommandations: list[RecommandationOut]


# ──────────────────────────── rappels ────────────────────────────


class RappelCreate(BaseModel):
    libelle: str
    date_rappel: datetime
    ressource_id: str | None = None


class RappelOut(BaseModel):
    model_config = _orm

    id: str
    libelle: str
    date_rappel: datetime
    envoye: bool
    date_envoi: datetime | None = None


# ──────────────────────────── santé ────────────────────────────


class HealthOut(BaseModel):
    status: str
    database: bool
