from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/rapports", tags=["Rapports"])


@router.post("/", response_model=schemas.Rapport, status_code=201)
def create_rapport(payload: schemas.RapportCreate, db: Session = Depends(get_db)):
    if not db.get(models.Profil, payload.profil_id):
        raise HTTPException(404, "Profil introuvable")
    rapport = models.Rapport(**payload.model_dump())
    db.add(rapport)
    db.commit()
    db.refresh(rapport)
    return rapport


@router.get("/", response_model=List[schemas.Rapport])
def list_rapports(profil_id: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(models.Rapport)
    if profil_id:
        q = q.filter(models.Rapport.profil_id == profil_id)
    return q.all()


@router.get("/{rapport_id}", response_model=schemas.Rapport)
def get_rapport(rapport_id: str, db: Session = Depends(get_db)):
    rapport = db.get(models.Rapport, rapport_id)
    if not rapport:
        raise HTTPException(404, "Rapport introuvable")
    return rapport


@router.delete("/{rapport_id}", status_code=204)
def delete_rapport(rapport_id: str, db: Session = Depends(get_db)):
    rapport = db.get(models.Rapport, rapport_id)
    if not rapport:
        raise HTTPException(404, "Rapport introuvable")
    db.delete(rapport)
    db.commit()
