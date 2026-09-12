from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/profils/{profil_id}", tags=["Recommandations"])


def _get_profil(profil_id: str, db: Session) -> models.Profil:
    profil = db.get(models.Profil, profil_id)
    if not profil:
        raise HTTPException(404, "Profil introuvable")
    return profil


# ---------------- Filieres recommandées ----------------
@router.post("/filieres/{filiere_id}", response_model=schemas.Profil)
def recommander_filiere(profil_id: str, filiere_id: str, db: Session = Depends(get_db)):
    profil = _get_profil(profil_id, db)
    filiere = db.get(models.Filiere, filiere_id)
    if not filiere:
        raise HTTPException(404, "Filiere introuvable")
    if filiere not in profil.filieres_recommandees:
        profil.filieres_recommandees.append(filiere)
        db.commit()
        db.refresh(profil)
    return profil


@router.get("/filieres", response_model=List[schemas.Filiere])
def get_filieres_recommandees(profil_id: str, db: Session = Depends(get_db)):
    return _get_profil(profil_id, db).filieres_recommandees


@router.delete("/filieres/{filiere_id}", status_code=204)
def retirer_filiere(profil_id: str, filiere_id: str, db: Session = Depends(get_db)):
    profil = _get_profil(profil_id, db)
    filiere = db.get(models.Filiere, filiere_id)
    if filiere in profil.filieres_recommandees:
        profil.filieres_recommandees.remove(filiere)
        db.commit()


# ---------------- Offres recommandées ----------------
@router.post("/offres/{offre_id}", response_model=schemas.Profil)
def recommander_offre(profil_id: str, offre_id: str, db: Session = Depends(get_db)):
    profil = _get_profil(profil_id, db)
    offre = db.get(models.Offre, offre_id)
    if not offre:
        raise HTTPException(404, "Offre introuvable")
    if offre not in profil.offres_recommandees:
        profil.offres_recommandees.append(offre)
        db.commit()
        db.refresh(profil)
    return profil


@router.get("/offres", response_model=List[schemas.Offre])
def get_offres_recommandees(profil_id: str, db: Session = Depends(get_db)):
    return _get_profil(profil_id, db).offres_recommandees


@router.delete("/offres/{offre_id}", status_code=204)
def retirer_offre(profil_id: str, offre_id: str, db: Session = Depends(get_db)):
    profil = _get_profil(profil_id, db)
    offre = db.get(models.Offre, offre_id)
    if offre in profil.offres_recommandees:
        profil.offres_recommandees.remove(offre)
        db.commit()


# ---------------- Formations recommandées ----------------
@router.post("/formations/{formation_id}", response_model=schemas.Profil)
def recommander_formation(profil_id: str, formation_id: str, db: Session = Depends(get_db)):
    profil = _get_profil(profil_id, db)
    formation = db.get(models.Formation, formation_id)
    if not formation:
        raise HTTPException(404, "Formation introuvable")
    if formation not in profil.formations_recommandees:
        profil.formations_recommandees.append(formation)
        db.commit()
        db.refresh(profil)
    return profil


@router.get("/formations", response_model=List[schemas.Formation])
def get_formations_recommandees(profil_id: str, db: Session = Depends(get_db)):
    return _get_profil(profil_id, db).formations_recommandees


@router.delete("/formations/{formation_id}", status_code=204)
def retirer_formation(profil_id: str, formation_id: str, db: Session = Depends(get_db)):
    profil = _get_profil(profil_id, db)
    formation = db.get(models.Formation, formation_id)
    if formation in profil.formations_recommandees:
        profil.formations_recommandees.remove(formation)
        db.commit()
