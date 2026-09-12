from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/formations", tags=["Formations"])


@router.post("/", response_model=schemas.Formation, status_code=201)
def create_formation(payload: schemas.FormationCreate, db: Session = Depends(get_db)):
    formation = models.Formation(**payload.model_dump())
    db.add(formation)
    db.commit()
    db.refresh(formation)
    return formation


@router.get("/", response_model=List[schemas.Formation])
def list_formations(db: Session = Depends(get_db)):
    return db.query(models.Formation).all()


@router.delete("/{formation_id}", status_code=204)
def delete_formation(formation_id: str, db: Session = Depends(get_db)):
    formation = db.get(models.Formation, formation_id)
    if not formation:
        raise HTTPException(404, "Formation introuvable")
    db.delete(formation)
    db.commit()
