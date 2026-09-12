from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/profils", tags=["Profils"])


@router.post("/", response_model=schemas.Profil, status_code=201)
def create_profil(payload: schemas.ProfilCreate, db: Session = Depends(get_db)):
    user = db.get(models.Utilisateur, payload.whatsapp_id)
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    # CORRECTION : force la cardinalité 1-1 Utilisateur <-> Profil du UML
    if user.profil is not None:
        raise HTTPException(400, "Cet utilisateur possède déjà un profil")
    profil = models.Profil(**payload.model_dump())
    db.add(profil)
    db.commit()
    db.refresh(profil)
    return profil


@router.get("/", response_model=List[schemas.Profil])
def list_profils(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Profil).offset(skip).limit(limit).all()


@router.get("/{profil_id}", response_model=schemas.Profil)
def get_profil(profil_id: str, db: Session = Depends(get_db)):
    profil = db.get(models.Profil, profil_id)
    if not profil:
        raise HTTPException(404, "Profil introuvable")
    return profil


@router.patch("/{profil_id}", response_model=schemas.Profil)
def update_profil(profil_id: str, payload: schemas.ProfilUpdate, db: Session = Depends(get_db)):
    profil = db.get(models.Profil, profil_id)
    if not profil:
        raise HTTPException(404, "Profil introuvable")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profil, field, value)
    db.commit()
    db.refresh(profil)
    return profil


@router.delete("/{profil_id}", status_code=204)
def delete_profil(profil_id: str, db: Session = Depends(get_db)):
    profil = db.get(models.Profil, profil_id)
    if not profil:
        raise HTTPException(404, "Profil introuvable")
    db.delete(profil)
    db.commit()
