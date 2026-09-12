import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Date, ForeignKey, Table, JSON, Float
from sqlalchemy.orm import relationship

from .database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


# ---------------------------------------------------------------------
# Tables d'association (many-to-many) pour les relations "recommande".
# CORRECTION UML : le diagramme dessinait ces liens en 1 -- 0..*
# (ex: Profil "1" -> Offre "0..*"), ce qui obligerait une Offre ou une
# Formation à n'appartenir qu'à UN SEUL Profil. Or une même offre
# d'emploi ou formation doit pouvoir être recommandée à plusieurs
# profils : ce sont donc de vraies relations many-to-many.
# ---------------------------------------------------------------------

profil_filiere_recommandee = Table(
    "profil_filiere_recommandee",
    Base.metadata,
    Column("profil_id", String, ForeignKey("profils.id"), primary_key=True),
    Column("filiere_id", String, ForeignKey("filieres.id"), primary_key=True),
    Column("score", Float, nullable=True),
    Column("date_recommandation", DateTime, default=datetime.utcnow),
)

profil_offre_recommandee = Table(
    "profil_offre_recommandee",
    Base.metadata,
    Column("profil_id", String, ForeignKey("profils.id"), primary_key=True),
    Column("offre_id", String, ForeignKey("offres.id"), primary_key=True),
    Column("score", Float, nullable=True),
    Column("date_recommandation", DateTime, default=datetime.utcnow),
)

profil_formation_recommandee = Table(
    "profil_formation_recommandee",
    Base.metadata,
    Column("profil_id", String, ForeignKey("profils.id"), primary_key=True),
    Column("formation_id", String, ForeignKey("formations.id"), primary_key=True),
    Column("score", Float, nullable=True),
    Column("date_recommandation", DateTime, default=datetime.utcnow),
)


class Utilisateur(Base):
    __tablename__ = "utilisateurs"

    whatsapp_id = Column(String, primary_key=True, index=True)
    nom = Column(String, nullable=False)
    date_creation = Column(DateTime, default=datetime.utcnow)

    # CORRECTION : uselist=False + unique=True côté Profil forcent le
    # vrai 1-1 "possede" dessiné dans le UML (Utilisateur "1" -- "1" Profil).
    profil = relationship(
        "Profil", back_populates="utilisateur", uselist=False,
        cascade="all, delete-orphan",
    )


class Profil(Base):
    __tablename__ = "profils"

    id = Column(String, primary_key=True, default=gen_uuid)
    whatsapp_id = Column(
        String, ForeignKey("utilisateurs.whatsapp_id"), unique=True, nullable=False
    )
    track = Column(String, nullable=True)
    interets = Column(JSON, default=list)  # String[] du UML -> JSON list
    ville = Column(String, nullable=True)
    cv_summary = Column(String, nullable=True)

    utilisateur = relationship("Utilisateur", back_populates="profil")
    rapports = relationship(
        "Rapport", back_populates="profil", cascade="all, delete-orphan"
    )
    filieres_recommandees = relationship(
        "Filiere", secondary=profil_filiere_recommandee, back_populates="profils"
    )
    offres_recommandees = relationship(
        "Offre", secondary=profil_offre_recommandee, back_populates="profils"
    )
    formations_recommandees = relationship(
        "Formation", secondary=profil_formation_recommandee, back_populates="profils"
    )


class Rapport(Base):
    __tablename__ = "rapports"

    id = Column(String, primary_key=True, default=gen_uuid)
    # CORRECTION : le UML montrait "genere" Profil -> Rapport mais
    # Rapport n'avait aucune colonne pour porter cette relation.
    profil_id = Column(String, ForeignKey("profils.id"), nullable=False)
    track = Column(String, nullable=True)
    pdf_path = Column(String, nullable=True)

    profil = relationship("Profil", back_populates="rapports")


class Filiere(Base):
    __tablename__ = "filieres"

    id = Column(String, primary_key=True, default=gen_uuid)
    nom = Column(String, nullable=False)
    universite = Column(String, nullable=True)

    profils = relationship(
        "Profil", secondary=profil_filiere_recommandee,
        back_populates="filieres_recommandees",
    )
    debouches = relationship(
        "Debouche", back_populates="filiere", cascade="all, delete-orphan"
    )


class Debouche(Base):
    __tablename__ = "debouches"

    id = Column(String, primary_key=True, default=gen_uuid)
    # CORRECTION : "mene_a" Filiere -> Debouche, FK manquante dans le UML.
    # Ceci évite aussi tout lien direct Profil -> Debouche : on passe
    # obligatoirement par Filiere, comme suggéré par la note du diagramme.
    filiere_id = Column(String, ForeignKey("filieres.id"), nullable=False)
    metier = Column(String, nullable=False)
    salaire_estime = Column(String, nullable=True)

    filiere = relationship("Filiere", back_populates="debouches")


class Offre(Base):
    __tablename__ = "offres"

    id = Column(String, primary_key=True, default=gen_uuid)
    titre = Column(String, nullable=False)
    entreprise = Column(String, nullable=True)

    profils = relationship(
        "Profil", secondary=profil_offre_recommandee,
        back_populates="offres_recommandees",
    )
    event_reminders = relationship(
        "EventReminder", back_populates="offre", cascade="all, delete-orphan"
    )


class EventReminder(Base):
    __tablename__ = "event_reminders"

    id = Column(String, primary_key=True, default=gen_uuid)
    # CORRECTION : "declenche" Offre -> EventReminder, FK manquante dans le UML.
    offre_id = Column(String, ForeignKey("offres.id"), nullable=False)
    type = Column(String, nullable=True)
    date_rappel = Column(Date, nullable=True)

    offre = relationship("Offre", back_populates="event_reminders")


class Formation(Base):
    __tablename__ = "formations"

    id = Column(String, primary_key=True, default=gen_uuid)
    nom = Column(String, nullable=False)
    competence_ciblee = Column(String, nullable=True)

    profils = relationship(
        "Profil", secondary=profil_formation_recommandee,
        back_populates="formations_recommandees",
    )
