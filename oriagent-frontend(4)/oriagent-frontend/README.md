# OriAgent — Console d'orientation

Frontend React (Vite + Tailwind) pour le backend FastAPI OriAgent. C'est la console interne
pour consulter les utilisateurs WhatsApp, leurs profils générés, et gérer les données de
référence (filières, débouchés, offres, formations) qui alimentent les recommandations.

## Démarrer

```bash
npm install
cp .env.example .env   # ajuster VITE_API_URL si besoin
npm run dev
```

Par défaut, le frontend attend le backend FastAPI sur `http://localhost:8000`
(assurez-vous que `app.add_middleware(CORSMiddleware, ...)` autorise `http://localhost:5173`,
ce qui est déjà le cas avec `allow_origins=["*"]` dans le backend fourni).

## Structure

```
src/
  api.js                 # client fetch générique vers le backend
  config/resources.js    # déclare colonnes + formulaires pour chaque entité
  components/
    Sidebar.jsx
    ResourceCrud.jsx      # liste + création + suppression, générique et réutilisé
  pages/
    Dashboard.jsx          # compteurs globaux
    ProfilDetail.jsx        # fiche profil + gestion des recommandations (many-to-many)
```

## Pages

- **Vue d'ensemble** : compteurs par entité.
- **Utilisateurs / Filières / Débouchés / Offres / Formations / Rapports / Rappels** :
  liste + création + suppression via le composant générique `ResourceCrud`.
- **Profils** : liste cliquable → fiche détail avec gestion des filières, offres et
  formations recommandées (ajout/retrait, relations many-to-many) et les rapports liés.
