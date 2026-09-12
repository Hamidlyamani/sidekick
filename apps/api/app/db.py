"""
Moteur et session SQLAlchemy 2.0 async.

Choix SQLite : zéro serveur à lancer, un fichier à copier, et tu peux l'ouvrir
avec DB Browser pendant la démo pour montrer le contenu au jury. Passe à
Postgres en changeant DATABASE_URL uniquement — aucun modèle ne bouge.

Deux réglages ici évitent des bugs de 3h du matin :

- `expire_on_commit=False` : sans ça, accéder à un attribut après commit
  déclenche un refresh lazy hors contexte greenlet -> MissingGreenlet.
  C'est LE piège de SQLAlchemy async.

- WAL + busy_timeout : SQLite verrouille en écriture. Dès que le webhook et le
  scheduler écrivent en même temps, tu prends « database is locked ».
"""

from __future__ import annotations

import os
from collections.abc import AsyncIterator

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from .models import Base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./oriente.db")
_IS_SQLITE = DATABASE_URL.startswith("sqlite")

engine = create_async_engine(
    DATABASE_URL,
    echo=os.getenv("SQL_ECHO", "").lower() in {"1", "true"},
    connect_args={"timeout": 30} if _IS_SQLITE else {},
)

SessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


if _IS_SQLITE:

    @event.listens_for(engine.sync_engine, "connect")
    def _sqlite_pragmas(dbapi_conn, _record):  # pragma: no cover
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA journal_mode=WAL")
        cur.execute("PRAGMA busy_timeout=30000")
        cur.execute("PRAGMA foreign_keys=ON")
        cur.close()


async def get_session() -> AsyncIterator[AsyncSession]:
    """Dépendance FastAPI : `session: AsyncSession = Depends(get_session)`."""
    async with SessionLocal() as session:
        yield session


async def init_db() -> None:
    """create_all suffit pour un hackathon. Pas d'Alembic : tu ne migreras rien
    en 24h, et une migration cassée à 4h du matin coûte ta démo."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def ping() -> bool:
    """Pour /health — montre au jury que l'app détecte une panne de base."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
