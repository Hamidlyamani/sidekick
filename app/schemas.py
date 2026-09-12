from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class OrmBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Utilisateur ----------
class UtilisateurBase(BaseModel):
    nom: str


class UtilisateurCreate(UtilisateurBase):
    whatsapp_id: str


class Utilisateur(UtilisateurBase, OrmBase):
    whatsapp_id: str
    date_creation: datetime


# ---------- Profil ----------
class ProfilBase(BaseModel):
    track: Optional[str] = None
    interets: List[str] = []
    ville: Optional[str] = None
    cv_summary: Optional[str] = None


class ProfilCreate(ProfilBase):
    whatsapp_id: str


class ProfilUpdate(ProfilBase):
    pass


class Profil(ProfilBase, OrmBase):
    id: str
    whatsapp_id: str


# ---------- Rapport ----------
class RapportBase(BaseModel):
    track: Optional[str] = None
    pdf_path: Optional[str] = None


class RapportCreate(RapportBase):
    profil_id: str


class Rapport(RapportBase, OrmBase):
    id: str
    profil_id: str


# ---------- Filiere ----------
class FiliereBase(BaseModel):
    nom: str
    universite: Optional[str] = None


class FiliereCreate(FiliereBase):
    pass


class Filiere(FiliereBase, OrmBase):
    id: str


# ---------- Debouche ----------
class DeboucheBase(BaseModel):
    metier: str
    salaire_estime: Optional[str] = None


class DeboucheCreate(DeboucheBase):
    filiere_id: str


class Debouche(DeboucheBase, OrmBase):
    id: str
    filiere_id: str


# ---------- Offre ----------
class OffreBase(BaseModel):
    titre: str
    entreprise: Optional[str] = None


class OffreCreate(OffreBase):
    pass


class Offre(OffreBase, OrmBase):
    id: str


# ---------- EventReminder ----------
class EventReminderBase(BaseModel):
    type: Optional[str] = None
    date_rappel: Optional[date] = None


class EventReminderCreate(EventReminderBase):
    offre_id: str


class EventReminder(EventReminderBase, OrmBase):
    id: str
    offre_id: str


# ---------- Formation ----------
class FormationBase(BaseModel):
    nom: str
    competence_ciblee: Optional[str] = None


class FormationCreate(FormationBase):
    pass


class Formation(FormationBase, OrmBase):
    id: str
