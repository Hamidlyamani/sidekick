from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/debouches", tags=["Debouches"])


@router.post("/", response_model=schemas.Debouche, status_code=201)
def create_debouche(payload: schemas.DeboucheCreate, db: Session = Depends(get_db)):
    if not db.get(models.Filiere, payload.filiere_id):
        raise HTTPException(404, "Filiere introuvable")
    debouche = models.Debouche(**payload.model_dump())
    db.add(debouche)
    db.commit()
    db.refresh(debouche)
    return debouche


@router.get("/", response_model=List[schemas.Debouche])
def list_debouches(filiere_id: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(models.Debouche)
    if filiere_id:
        q = q.filter(models.Debouche.filiere_id == filiere_id)
    return q.all()


@router.delete("/{debouche_id}", status_code=204)
def delete_debouche(debouche_id: str, db: Session = Depends(get_db)):
    debouche = db.get(models.Debouche, debouche_id)
    if not debouche:
        raise HTTPException(404, "Debouche introuvable")
    db.delete(debouche)
    db.commit()
