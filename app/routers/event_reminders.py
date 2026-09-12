from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/event-reminders", tags=["EventReminders"])


@router.post("/", response_model=schemas.EventReminder, status_code=201)
def create_event_reminder(payload: schemas.EventReminderCreate, db: Session = Depends(get_db)):
    if not db.get(models.Offre, payload.offre_id):
        raise HTTPException(404, "Offre introuvable")
    reminder = models.EventReminder(**payload.model_dump())
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


@router.get("/", response_model=List[schemas.EventReminder])
def list_event_reminders(offre_id: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(models.EventReminder)
    if offre_id:
        q = q.filter(models.EventReminder.offre_id == offre_id)
    return q.all()


@router.delete("/{reminder_id}", status_code=204)
def delete_event_reminder(reminder_id: str, db: Session = Depends(get_db)):
    reminder = db.get(models.EventReminder, reminder_id)
    if not reminder:
        raise HTTPException(404, "Reminder introuvable")
    db.delete(reminder)
    db.commit()
