# Oriente AI — couche base de données (FastAPI)

Couche persistance seule. La logique agent (Exa, LLM, envoi WhatsApp) consomme
`app/crud.py` et n'écrit pas de SQL.

## Démarrer

```bash
cd apps/api
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

python -m app.seed        # pré-remplit 4 filières + 13 débouchés réels
python smoke_test.py      # doit afficher TOUT OK
uvicorn app.main:app --reload
```

`http://localhost:8000/docs` pour la doc interactive.

## Fichiers

| Fichier | Rôle |
|---|---|
| `app/models.py` | Les 5 tables + les écarts assumés vs l'ERD initial |
| `app/db.py` | Moteur async, session, pragmas SQLite |
| `app/crud.py` | Toutes les opérations base — le seul module que l'agent appelle |
| `app/schemas.py` | Pydantic, frontière HTTP |
| `app/seed.py` | Données de démo réelles et sourcées |
| `app/main.py` | Câblage FastAPI + squelette webhook |
| `smoke_test.py` | 8 vérifications de bout en bout |

## Le schéma : 5 tables, pas 8

| Table | Rôle |
|---|---|
| `profil` | UTILISATEUR + PROFIL fusionnés (la relation était 1:1) |
| `message` | Historique de conversation — **absent de l'ERD initial, bloquant** |
| `ressource` | FILIERE + FORMATION + OFFRE + DEBOUCHE fusionnées, discriminant `type` |
| `recommandation` | Jonction profil ↔ ressource avec **score + justification** |
| `rappel` | Push proactif, sans Google Calendar |

Ce qui a été retiré et pourquoi : `RAPPORT` (le PDF se génère à la volée, rien à
persister pour la démo), `calendar_event_id` (OAuth Google depuis WhatsApp =
une deuxième intégration complète pour zéro valeur perçue supplémentaire), et
la colonne `salaire_estime` (aucune source marocaine fiable et indexée ; elle
vit dans `meta` et doit toujours porter sa source).

## Quatre décisions qui évitent des bugs de 3h du matin

**1. `message.wa_message_id` est UNIQUE.** Meta rejoue tout webhook non
acquitté dans les délais. Sans cette contrainte, l'utilisateur reçoit deux
réponses. Le garde-fou tient en une ligne :

```python
if await crud.add_message(session, profil.id, Role.user, texte, wa_message_id=wid) is None:
    return {"status": "duplicate"}
```

**2. Pas de collections côté `Profil`.** En SQLAlchemy async, ajouter un enfant
dont le parent est en session fait charger la collection du parent → lazy load
hors greenlet → `MissingGreenlet`. La cascade de suppression est assurée par la
base (`ondelete="CASCADE"` + `PRAGMA foreign_keys=ON`), pas par l'ORM.

**3. SAVEPOINT au lieu de `rollback()` sur conflit d'unicité.**
`session.rollback()` expire **tous** les objets de la session, y compris le
profil chargé plus tôt — l'accès suivant à `profil.id` plante *à l'appel
d'après*, très loin de la vraie cause. C'est exactement l'erreur que ce code a
produite au premier test. `async with session.begin_nested()` n'annule que
l'insert fautif.

**4. `expire_on_commit=False` + WAL + `busy_timeout=30s`.** Sans WAL, le
webhook et le scheduler qui écrivent en même temps donnent
« database is locked ».

## Le motif webhook (la contrainte qui casse les démos)

Meta attend un `200` rapide. Trois recherches Exa (250 ms à 5 s chacune) plus
un appel LLM en synchrone dans le handler = dépassement de délai, rejeu, double
réponse.

```
webhook -> persiste le message -> répond 200 -> traite en tâche de fond
                                             -> envoie via l'API send-message
```

Le squelette est dans `app/main.py`. **La tâche de fond doit ouvrir sa propre
session** : celle de la route est fermée dès le retour.

## Pour la démo

Le seed contient des filières réelles, vérifiées via Exa le 12/09/2026 sur
`est-uh2c.ac.ma`, `fstm.ac.ma` et `univh2c.ma`, avec leurs URLs. Affiche
toujours l'URL : c'est ce qui distingue une recommandation sourcée d'une
hallucination, et le rubric note la fiabilité de l'intégration.

Ne fais pas d'appel Exa live en boucle devant le jury — pré-remplis, réponds
instantanément, et montre **un** appel live sur une action explicite.

Le critère « Technical Execution & Integration » demande de montrer une erreur
gérée : `GET /health` renvoie `{"status": "degraded", "database": false}` si tu
coupes la base. Renomme `oriente.db` pendant la démo, montre que l'app le
détecte au lieu de planter.

## Passer à PostgreSQL

Change `DATABASE_URL` uniquement, aucun modèle ne bouge :

```bash
DATABASE_URL="postgresql+asyncpg://user:pass@host/db"   # + pip install asyncpg
```

## Note hackathon

Le règlement impose de distinguer le code hérité du code écrit pendant
l'événement. Ce dossier est écrit pendant l'événement ; le starter kit
`apps/channel`, `apps/web`, `apps/mobile` est hérité. Note-le dans
`SUBMISSION.md`.
