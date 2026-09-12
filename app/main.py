from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import (
    utilisateurs, profils, rapports, filieres,
    debouches, offres, event_reminders, formations, recommendations,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="OrientAI API",
    description="Backend FastAPI généré à partir du diagramme de classes UML OrientAI",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(utilisateurs.router)
app.include_router(profils.router)
app.include_router(rapports.router)
app.include_router(filieres.router)
app.include_router(debouches.router)
app.include_router(offres.router)
app.include_router(event_reminders.router)
app.include_router(formations.router)
app.include_router(recommendations.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "OrientAI API"}
