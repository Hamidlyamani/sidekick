# Oriente AI — agent WhatsApp

Bot WhatsApp d'orientation pour étudiants et jeunes diplômés. Il tient une
conversation naturelle, se souvient du contact, et recommande des filières et
débouchés **sourcés** plutôt que devinés.

## Architecture : deux processus

```
   WhatsApp (whatsapp-web.js, QR code)
        │
        ▼
   apps/whatsapp   ──HTTP──►   apps/api        ──►  SQLite
   agent Node.js               FastAPI              profil, historique,
   OpenAI + web_search         (couche données)     catalogue, recos
```

Le bot ne contient **aucune** requête SQL : il parle à l'API. L'API ne contient
**aucun** appel à un modèle : elle stocke. Les deux se lancent séparément.

## Lancer — deux terminaux

**Terminal 1, l'API :**

```bash
cd apps/api
.venv\Scripts\activate          # Windows  (source .venv/bin/activate sinon)
python -m app.seed              # une seule fois : remplit le catalogue
uvicorn app.main:app
```

**Terminal 2, le bot :**

```bash
cd apps/whatsapp
cp .env.example .env            # puis colle ta clé OpenAI
npm install
npm run dev
```

Scanne le QR code : WhatsApp → Appareils connectés → Connecter un appareil.

Au démarrage, le bot affiche `✅ API Oriente joignable.` — s'il affiche
l'avertissement dégradé à la place, l'API n'est pas lancée.

## Ce qui se passe à chaque message

1. **Persistance d'abord.** `POST /profils/{id}/messages`. Si l'API répond
   `duplicate: true`, whatsapp-web.js a relivré un message après une
   reconnexion : le bot s'arrête sans répondre deux fois.
2. **Contexte en un seul appel.** `GET /profils/{id}/contexte` renvoie profil +
   historique + catalogue + recommandations déjà faites. Trois requêtes
   séparées se verraient sur WhatsApp.
3. **Réponse.** Le prompt reçoit le profil réel, le fil de conversation, et un
   catalogue où **chaque entrée porte son URL source**.
4. **Persistance de la réponse**, pour que le tour suivant ait le fil complet.
5. **Enrichissement du profil** après coup — ville, niveau, parcours, intérêts
   extraits de ce que l'utilisateur a dit. Après la réponse, jamais avant :
   l'utilisateur n'attend pas un second appel LLM.

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/index.js` | Client WhatsApp, boucle de messages, anti-doublon |
| `src/api-client.js` | Pont HTTP vers FastAPI — dégrade, ne plante jamais |
| `src/context-builder.js` | Contexte API → texte de prompt (testable sans réseau) |
| `src/openai-agent.js` | Appels OpenAI : réponse + extraction de profil |
| `src/agent.js` | Orchestration d'un message |
| `src/bot-config.js` | Nom et message d'accueil |

## Le mode dégradé, et pourquoi il compte

Si l'API est injoignable, `api-client.js` retourne `null` — jamais une
exception. Le bot répond quand même, et le prompt dit explicitement au modèle
qu'il n'a **aucun** catalogue, avec interdiction d'inventer une filière ou un
établissement.

C'est la preuve demandée par le critère « Technical Execution & Integration »
(*show how a relevant error or cancellation is handled*). Pour le montrer en
démo : coupe l'API, envoie un message, le bot répond et refuse d'inventer.

## Anti-hallucination

Le catalogue injecté dans le prompt porte les URLs officielles
(`est-uh2c.ac.ma`, `fstm.ac.ma`, `univh2c.ma`), vérifiées le 12/09/2026. Les
règles du prompt imposent de citer la source et interdisent toute filière hors
catalogue. Un modèle à qui on donne des sources invente beaucoup moins qu'un
modèle à qui on donne des titres nus.

## Avertissement — whatsapp-web.js

Cette bibliothèque n'est pas officielle : elle pilote WhatsApp Web via
Puppeteer. Elle évite toute la validation business de l'API Meta Cloud, ce qui
en fait le bon choix pour un hackathon. Mais elle est contraire aux conditions
d'utilisation de WhatsApp et **des comptes se font bannir**.

**N'utilise pas ton numéro personnel.** Prends une puce de test ou un second
numéro. Pour la vidéo de démo, c'est sans conséquence ; pour un vrai produit,
il faudra repasser sur l'API Meta Cloud — seul `src/index.js` change, le reste
de la chaîne est déjà indépendant du transport.
