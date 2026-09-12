from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/utilisateurs", tags=["Utilisateurs"])


@router.post("/", response_model=schemas.Utilisateur, status_code=201)
def create_utilisateur(payload: schemas.UtilisateurCreate, db: Session = Depends(get_db)):
    if db.get(models.Utilisateur, payload.whatsapp_id):
        raise HTTPException(400, "Un utilisateur avec ce whatsapp_id existe déjà")
    user = models.Utilisateur(**payload.model_dump())
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/", response_model=List[schemas.Utilisateur])
def list_utilisateurs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Utilisateur).offset(skip).limit(limit).all()


@router.get("/{whatsapp_id}", response_model=schemas.Utilisateur)
def get_utilisateur(whatsapp_id: str, db: Session = Depends(get_db)):
    user = db.get(models.Utilisateur, whatsapp_id)
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    return user


@router.delete("/{whatsapp_id}", status_code=204)
def delete_utilisateur(whatsapp_id: str, db: Session = Depends(get_db)):
    user = db.get(models.Utilisateur, whatsapp_id)
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    db.delete(user)
    db.commit()
