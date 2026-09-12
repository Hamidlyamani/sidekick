from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/filieres", tags=["Filieres"])


@router.post("/", response_model=schemas.Filiere, status_code=201)
def create_filiere(payload: schemas.FiliereCreate, db: Session = Depends(get_db)):
    filiere = models.Filiere(**payload.model_dump())
    db.add(filiere)
    db.commit()
    db.refresh(filiere)
    return filiere


@router.get("/", response_model=List[schemas.Filiere])
def list_filieres(db: Session = Depends(get_db)):
    return db.query(models.Filiere).all()


@router.get("/{filiere_id}", response_model=schemas.Filiere)
def get_filiere(filiere_id: str, db: Session = Depends(get_db)):
    filiere = db.get(models.Filiere, filiere_id)
    if not filiere:
        raise HTTPException(404, "Filiere introuvable")
    return filiere


@router.delete("/{filiere_id}", status_code=204)
def delete_filiere(filiere_id: str, db: Session = Depends(get_db)):
    filiere = db.get(models.Filiere, filiere_id)
    if not filiere:
        raise HTTPException(404, "Filiere introuvable")
    db.delete(filiere)
    db.commit()
