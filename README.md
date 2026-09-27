# Deux pas un monde

[![Latest release](https://img.shields.io/github/v/release/cmarcellot/Deux-pas-un-monde)](https://github.com/cmarcellot/Deux-pas-un-monde/releases)

Site web compagnon du compte Instagram [@deuxpas_unmonde](https://www.instagram.com/deuxpas_unmonde) — Un carnet de voyage interactif pour partager bonnes adresses et guides de voyage.

## Aperçu

"Deux pas un monde" est une plateforme de partage d'expériences de voyage permettant de découvrir des hébergements, restaurants, activités et bonnes adresses à travers une carte interactive ou une liste visuelle, ainsi que des guides de voyage complets avec itinéraires jour par jour.

## Fonctionnalités

### Pour les visiteurs
- **Page d'accueil** : héro plein écran, barre de recherche, bandeau de catégories, aperçu des meilleures adresses et des guides de voyage
- **Page Nos adresses** (`/adresses`) : toutes les adresses, avec recherche et 3 vues disponibles — Liste, Carte, et vue hybride Liste + Carte côte à côte
- **Vue Liste** : Cartes visuelles avec photo, note, badge catégorie coloré, ville et date de visite
- **Vue Carte** : Marqueurs colorés par catégorie sur OpenStreetMap, popups au clic
- **Filtrage par catégorie** :
  - 🛏 Hébergements insolites (bleu-gris)
  - 🍽 Gastronomie & Terroir (terracotta)
  - 🧭 Nature & Aventure (vert)
  - 🌿 Bien-être & Spa (ocre)
- **Recherche textuelle** : Filtrer les lieux par nom en temps réel
- **Détails en modal** : Informations complètes d'un lieu avec galerie photos, note, adresse et date de visite
- **Page détail** dédiée par lieu (`/place/:id`)
- **Galerie photos** : Lightbox avec navigation clavier et tactile
- **Notation par étoiles** : Appréciation de chaque lieu (1 à 5 étoiles)

### Guides de Voyage
- **Page `/guides`** : Bibliothèque de guides publiés, avec recherche et vues Liste / Carte
- **Page détail guide** avec 4 onglets :
  - **Itinéraire** : Accordéons jour par jour avec activités, horaires et conseils
  - **Infos pratiques** : Budget estimé, meilleures saisons, transports, visa, monnaie, langue
  - **Photos** : Galerie avec lightbox
  - **Carte** : Visualisation des lieux liés sur Leaflet
- **Statut publié / brouillon** : Préparer un guide sans le rendre public

### Pour les administrateurs
- **Interface d'administration sécurisée** : Accès protégé par JWT (`/admin`)
- **Gestion des lieux** :
  - Ajouter, modifier, supprimer des lieux
  - Champs : titre, adresse, ville, pays, date de visite, description, catégorie, note, coordonnées GPS
  - Upload de photos multiples par drag & drop ou sélection
  - Prévisualisation locale avant upload (les fichiers ne sont envoyés qu'à la sauvegarde)
  - Suppression des fichiers du stockage lors de la suppression d'une photo ou d'un lieu
  - Géolocalisation automatique depuis l'adresse
  - Description enrichie (éditeur Quill)
- **Gestion des guides** :
  - Builder d'itinéraire jour par jour
  - Ajout d'activités avec horaires et lieux liés
  - Infos pratiques (budget, transport, visa, monnaie, langue)
  - Upload de cover image et photos supplémentaires
  - Suppression des fichiers du stockage lors de la suppression d'une photo ou d'un guide
  - Toggle publié / brouillon
- **Changement de mot de passe** depuis l'interface

## Stack technique

### Frontend
- **React 18** — Interface utilisateur (SPA monolithique `App.js`)
- **React Router 6** — Navigation SPA
- **Leaflet / React-Leaflet** — Carte interactive OpenStreetMap
- **Framer Motion** — Animations fluides
- **React Quill** — Éditeur de texte enrichi
- **Lucide React** — Icônes
- **Sonner** — Notifications toast

### Backend
- **FastAPI** — API REST Python
- **MongoDB** — Base de données NoSQL (via PyMongo)
- **Stockage local** — Images hébergées sur le serveur (`/app/uploads/{type}/{id}/`)
- **JWT** — Authentification sécurisée (python-jose)
- **Uvicorn** — Serveur ASGI

### Déploiement
- **Dokploy** sur VPS
- Frontend : build nginx statique
- Backend : conteneur Python / Uvicorn
- Uploads : volume persistant monté sur `/app/uploads`

### Design
- Thème clair élégant (refonte v4)
- Fond : `#f5f1ea` / Surface : `#faf8f3`
- Accent : `#c17c5a` (terracotta doux)
- Texte : `#252826`
- Polices : **EB Garamond** (titres, logo) + **Jost** (corps)
- Carte : OpenStreetMap standard
- Catégories en couleurs OKLCH

## Installation

### Prérequis
- Node.js 18+
- Python 3.9+
- MongoDB

### Backend
```bash
cd backend
pip install -r requirements.txt
# créer backend/.env (voir « Variables d'environnement »)
python server.py
```

### Frontend
```bash
cd frontend
yarn install
yarn start
```

## Variables d'environnement

### Backend (`/backend/.env`)
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=deux_pas_un_monde
JWT_SECRET=votre_secret_jwt
ADMIN_PASSWORD=votre_mot_de_passe_admin
```

| Variable | Obligatoire | Rôle |
|----------|-------------|------|
| `MONGO_URL` | oui | URL de connexion MongoDB (avec identifiants en production) |
| `DB_NAME` | non | Nom de la base, `deux_pas_un_monde` par défaut |
| `JWT_SECRET` | oui | Clé de signature des sessions admin. Chaîne aléatoire longue, par exemple `python -c "import secrets; print(secrets.token_hex(32))"`. La changer déconnecte les sessions en cours |
| `ADMIN_PASSWORD` | oui | Mot de passe admin initial. Dès qu'il est changé depuis l'admin, c'est le mot de passe enregistré en base (hashé avec bcrypt) qui est utilisé, et cette variable n'est plus lue |
| `UMAMI_URL` | non | Adresse de l'instance Umami, avec `https://` et sans `/` final |
| `UMAMI_WEBSITE_ID` | non | Identifiant du site dans Umami (Umami : Settings → Websites) |
| `UMAMI_API_KEY` | non | Clé API Umami (Umami : Settings → API keys), secrète. Permet au backend de lire les statistiques |

Le backend refuse de démarrer si `MONGO_URL`, `JWT_SECRET` ou `ADMIN_PASSWORD` est absente, et affiche dans les logs le nom des variables manquantes. Les variables `UMAMI_*` sont facultatives : sans elles, le backend démarre normalement et `/api/admin/analytics` répond `configured: false`. En production, toutes sont définies dans l'onglet **Environment** de l'app backend sur Dokploy. Ne commitez jamais de fichier `.env` ni de valeur de secret.

### Frontend (`/frontend/.env`)
```env
REACT_APP_API_URL=http://localhost:8001
```

⚠️ **En production (Dokploy)** : le fichier `.env` du repo est écrasé/vidé par le pipeline de déploiement Dokploy avant le build. `REACT_APP_API_URL` doit être défini dans l'onglet **Environment** de l'app frontend sur Dokploy, pas seulement dans le fichier commité — sinon le build retombe sur la valeur par défaut codée en dur dans `App.js`.

| Variable | Obligatoire | Rôle |
|----------|-------------|------|
| `REACT_APP_API_URL` | oui | Adresse de l'API backend |
| `REACT_APP_UMAMI_URL` | non | Adresse de l'instance Umami, qui sert le script de suivi |
| `REACT_APP_UMAMI_WEBSITE_ID` | non | Identifiant du site dans Umami. Il n'est pas secret : il apparaît dans le code de la page |

Le script Umami n'est chargé que si les deux variables `REACT_APP_UMAMI_*` sont définies. Il ne compte que les visites sur `deuxpasunmonde.fr` et `www.deuxpasunmonde.fr` (pas le développement local) et n'envoie rien depuis les pages `/admin`. Pour ne pas compter ses propres visites, exécuter une fois `localStorage.setItem('umami.disabled', 1)` dans la console du navigateur, sur chacun des deux domaines.

## Structure du projet

```
/
├── backend/
│   ├── server.py          # API FastAPI (lieux, guides, uploads)
│   ├── requirements.txt   # Dépendances Python
│   └── .env               # Variables d'environnement
├── frontend/
│   ├── public/
│   │   ├── index.html     # HTML avec meta SEO + fonts
│   │   ├── favicon.png
│   │   ├── logo-deux-pas-un-monde-creme.png  # Logo nav (fond sombre)
│   │   ├── logo-deux-pas-un-monde-encre.png  # Logo (fond clair)
│   │   ├── logo-icone-creme.png              # Icône logo, pied de page
│   │   ├── logo-icone-encre.png
│   │   ├── hero.png                          # Image héro (accueil, adresses, guides)
│   │   └── guides-hero.png
│   ├── src/
│   │   ├── App.js         # Composant principal (toutes les pages)
│   │   ├── App.css        # Styles et animations
│   │   ├── hero.png        # Copie source de l'image héro (référencée en CSS)
│   │   ├── index.js       # Point d'entrée React
│   │   └── index.css      # Variables CSS globales + thème
│   ├── package.json
│   └── .env
├── docker-compose.yml
└── README.md
```

## API Endpoints

### Authentification
| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/api/auth/login` | — | Connexion admin (5 échecs max par IP sur 15 min, puis erreur 429) |
| GET | `/api/auth/verify` | ✓ | Vérifier le token |
| POST | `/api/auth/change-password` | ✓ | Changer le mot de passe |

### Lieux
| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api/places` | — | Liste des lieux (filtre `?category=X`) |
| GET | `/api/places/:id` | — | Détails d'un lieu |
| POST | `/api/places` | ✓ | Créer un lieu |
| PUT | `/api/places/:id` | ✓ | Modifier un lieu |
| DELETE | `/api/places/:id` | ✓ | Supprimer un lieu + ses fichiers |

### Guides de Voyage
| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api/guides` | — | Liste des guides publiés |
| GET | `/api/guides/all` | ✓ | Tous les guides (publiés + brouillons) |
| GET | `/api/guides/:id` | — | Détails d'un guide |
| POST | `/api/guides` | ✓ | Créer un guide |
| PUT | `/api/guides/:id` | ✓ | Modifier un guide |
| DELETE | `/api/guides/:id` | ✓ | Supprimer un guide + ses fichiers |

### Upload
| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/api/upload` | ✓ | Upload image (`?entity_type=X&entity_id=Y`) |
| POST | `/api/upload-base64` | ✓ | Upload image base64 |
| DELETE | `/api/upload` | ✓ | Supprimer un fichier (`?url=/uploads/...`) |
| GET | `/api/health` | — | Vérification du serveur |

Les fichiers sont stockés dans `/app/uploads/{entity_type}/{entity_id}/{uuid}.ext`.

### Mesure d'audience
| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api/admin/analytics` | ✓ | Vues du site lues dans Umami (`?period=7d`, `30d` ou `90d`, `7d` par défaut) |

Réponse, jours calculés dans le fuseau `Europe/Paris` :
- `configured` : `false` si une variable `UMAMI_*` manque (les autres champs valent alors `[]` ou `null`) ;
- `period` : la période demandée ;
- `daily` : `[{ "date": "YYYY-MM-DD", "views": 12 }, …]`, un élément par jour de la période, aujourd'hui compris, `0` pour les jours sans visite ;
- `total_views` et `previous_period_views` : vues de la période et de la période précédente de même durée ;
- `last_30_days_views` et `previous_30_days_views` : vues des 30 derniers jours et des 30 jours d'avant.

Si Umami ne répond pas ou refuse la requête : erreur 503 avec un message explicite. Période inconnue : erreur 400.

## Catégories de lieux

| ID backend | Nom affiché | Couleur |
|------------|-------------|---------|
| `accommodation` | Hébergements insolites | Bleu-gris OKLCH |
| `restaurant` | Gastronomie & Terroir | Terracotta OKLCH |
| `activity` | Nature & Aventure | Vert OKLCH |
| `gem` | Bien-être & Spa | Ocre OKLCH |

Le filtre "Toutes les adresses" (`all`) n'applique aucune restriction côté API.

## Auteurs

Créé avec passion par le duo [@deuxpas_unmonde](https://www.instagram.com/deuxpas_unmonde)

## Licence

© 2026 Deux pas un monde — Tous droits réservés
