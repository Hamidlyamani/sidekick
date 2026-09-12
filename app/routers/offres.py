from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/offres", tags=["Offres"])


@router.post("/", response_model=schemas.Offre, status_code=201)
def create_offre(payload: schemas.OffreCreate, db: Session = Depends(get_db)):
    offre = models.Offre(**payload.model_dump())
    db.add(offre)
    db.commit()
    db.refresh(offre)
    return offre


@router.get("/", response_model=List[schemas.Offre])
def list_offres(db: Session = Depends(get_db)):
    return db.query(models.Offre).all()


@router.get("/{offre_id}", response_model=schemas.Offre)
def get_offre(offre_id: str, db: Session = Depends(get_db)):
    offre = db.get(models.Offre, offre_id)
    if not offre:
        raise HTTPException(404, "Offre introuvable")
    return offre


@router.delete("/{offre_id}", status_code=204)
def delete_offre(offre_id: str, db: Session = Depends(get_db)):
    offre = db.get(models.Offre, offre_id)
    if not offre:
        raise HTTPException(404, "Offre introuvable")
    db.delete(offre)
    db.commit()
