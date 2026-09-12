"""
Pré-remplissage de la base avant la démo.

Pourquoi : un appel Exa prend 250ms à 5s. Trois recherches enchaînées devant
le jury = 15 secondes de silence sur WhatsApp, ça se lit comme une panne.
Tu pré-remplis, tu réponds instantanément, et tu montres un appel Exa live
une seule fois sur une action explicite.

Les données ci-dessous sont réelles : titres, établissements, modules et
débouchés relevés sur les pages officielles listées en `url`, vérifiées via
Exa le 12/09/2026. Garde les URLs — les afficher est ce qui distingue une
recommandation sourcée d'une hallucination.

    python -m app.seed
"""

from __future__ import annotations

import asyncio

from .db import SessionLocal, init_db
from .crud import upsert_ressource
from .models import TypeRessource

FILIERES = [
    {
        "titre": "DUT Génie Informatique",
        "organisation": "École Supérieure de Technologie de Casablanca (Université Hassan II)",
        "ville": "Casablanca",
        "secteur": "Informatique",
        "url": "https://www.est-uh2c.ac.ma/formation/formation-initiale/g%C3%A9nie-informatique-2/",
        "description": (
            "Diplôme universitaire de technologie en 4 semestres. Architecture des "
            "ordinateurs, structures de données et développement web serveur, systèmes "
            "et réseaux, systèmes d'information et bases de données, POO, génie logiciel, "
            "administration systèmes/réseaux/BD. Projet de fin d'études et stages techniques."
        ),
        "meta": {
            "niveau": "Bac+2",
            "acces": "BAC Sciences Mathématiques ou Sciences Expérimentales",
            "duree": "2 ans (4 semestres)",
        },
    },
    {
        "titre": "Licence Sciences & Techniques IRM (Ingénierie Réseaux & Multimédia)",
        "organisation": "Faculté des Sciences et Techniques de Mohammedia (Université Hassan II)",
        "ville": "Mohammedia",
        "secteur": "Informatique",
        "url": "https://www.fstm.ac.ma/formation_initiale/pages/Licence_IRM.php",
        "description": (
            "Licence Bac+3 hybride : ingénierie logicielle, infrastructures réseau, "
            "multimédia interactif et IA appliquée. Front-end, back-end, réseaux, "
            "données, IA, multimédia. Deux semestres dont un de spécialisation avec PFE "
            "et stage en entreprise équivalent à deux modules."
        ),
        "meta": {
            "niveau": "Bac+3",
            "acces": "Classement sur résultats du DEUST filière Génie Informatique",
            "contact": "Pr. Abdellah ADIB — abdellah.adib@fstm.ac.ma",
            "promotion": "2026-27",
        },
    },
    {
        "titre": "Cycle Ingénieur IDSI (Ingénierie Data Science et Informatique)",
        "organisation": "Faculté des Sciences et Techniques de Mohammedia (Université Hassan II)",
        "ville": "Mohammedia",
        "secteur": "Data / IA",
        "url": "https://www.fstm.ac.ma/formation_initiale/files/ci/FICHE_IDSI.pdf",
        "description": (
            "Cycle ingénieur en 3 ans. Trois axes : mathématiques (analyse numérique, "
            "calcul scientifique, recherche opérationnelle), science des données "
            "(statistiques inférentielles, fouille de données, machine learning et deep "
            "learning), informatique (Java, JEE, Python, écosystème Big Data, Hadoop, "
            "Spark, NLP, LLM, DevOps et MLOps)."
        ),
        "meta": {
            "niveau": "Bac+5",
            "acces": "DEUST, DEUG, LST, Licence Fondamentale, 2 années préparatoires ou équivalent",
            "duree": "3 ans",
        },
    },
    {
        "titre": "Développement informatique",
        "organisation": "Faculté des Sciences Aïn Chock (Université Hassan II)",
        "ville": "Casablanca",
        "secteur": "Informatique",
        "url": "https://www.univh2c.ma/page/detail/formation/1144/D%C3%A9veloppement%20informatique",
        "description": "Formation en développement informatique, Faculté des Sciences Aïn Chock Casablanca.",
        "meta": {"niveau": "à confirmer sur la page officielle"},
    },
]

# Débouchés tels que NOMMÉS sur les pages officielles ci-dessus.
# Aucun salaire : il n'existe pas de source marocaine fiable et indexée.
# Si tu ajoutes un salaire, ajoute `salaire_source` dans meta ou supprime-le.
DEBOUCHES = [
    ("Développeur de logiciel", "Informatique", FILIERES[0]["url"]),
    ("Administrateur systèmes, réseaux ou bases de données", "Infrastructure", FILIERES[0]["url"]),
    ("Concepteur de systèmes d'information", "Informatique", FILIERES[0]["url"]),
    ("Intégrateur de solution", "Informatique", FILIERES[0]["url"]),
    ("Développeur Full-Stack Web & Mobile", "Informatique", FILIERES[1]["url"]),
    ("Ingénieur Données & IA", "Data / IA", FILIERES[1]["url"]),
    ("Architecte logiciel", "Informatique", FILIERES[1]["url"]),
    ("Concepteur Multimédia (UX)", "Design", FILIERES[1]["url"]),
    ("Data Scientist", "Data / IA", FILIERES[2]["url"]),
    ("Data Analyst", "Data / IA", FILIERES[2]["url"]),
    ("Ingénieur Big Data", "Data / IA", FILIERES[2]["url"]),
    ("Ingénieur Machine Learning et Deep Learning", "Data / IA", FILIERES[2]["url"]),
    ("Ingénieur Business Intelligence", "Data / IA", FILIERES[2]["url"]),
]


async def seed() -> None:
    await init_db()
    async with SessionLocal() as session:
        for f in FILIERES:
            await upsert_ressource(
                session, type=TypeRessource.filiere, source="seed", **f
            )

        for metier, secteur, source_url in DEBOUCHES:
            await upsert_ressource(
                session,
                type=TypeRessource.debouche,
                titre=metier,
                secteur=secteur,
                url=f"{source_url}#debouche-{metier.lower().replace(' ', '-')[:40]}",
                description=f"Débouché listé par la formation source : {metier}.",
                meta={"source_page": source_url, "salaire_estime": None},
                source="seed",
            )

    print(f"Seed terminé : {len(FILIERES)} filières, {len(DEBOUCHES)} débouchés.")


if __name__ == "__main__":
    asyncio.run(seed())
