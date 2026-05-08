# Deux pas un monde

Site web compagnon du compte Instagram [@deuxpas_unmonde](https://www.instagram.com/deuxpas_unmonde) — Un carnet de voyage interactif pour partager nos bonnes adresses et guides de voyage.

## Aperçu

"Deux pas un monde" est une plateforme de partage d'expériences de voyage permettant de découvrir des hébergements, restaurants, activités et bonnes adresses à travers une carte interactive ou une liste visuelle, ainsi que des guides de voyage complets avec itinéraires jour par jour.

## Fonctionnalités

### Pour les visiteurs
- **3 vues disponibles** : Liste, Carte, et vue hybride Liste + Carte côte à côte
- **Vue Liste** : Cartes visuelles avec photo, note, badge catégorie coloré, ville et date de visite
- **Vue Carte** : Marqueurs colorés par catégorie sur OpenStreetMap, popups au clic
- **Filtrage par catégorie** :
  - 🛏 Dormir (bleu-gris)
  - 🍽 Manger (terracotta)
  - 🧭 Découvrir (vert)
  - ✈️ Partir (ocre)
- **Recherche textuelle** : Filtrer les lieux par nom en temps réel
- **Détails en modal** : Informations complètes d'un lieu avec galerie photos
- **Galerie photos** : Lightbox avec navigation clavier et tactile
- **Notation par étoiles** : Appréciation de chaque lieu (1 à 5 étoiles)

### Guides de Voyage
- **Page `/guides`** : Bibliothèque de guides
- **Page détail guide** avec 4 onglets :
  - **Itinéraire** : Accordéons jour par jour avec activités, horaires et conseils
  - **Infos pratiques** : Budget estimé, meilleures saisons, transports, visa, monnaie, langue
  - **Photos** : Galerie avec lightbox
  - **Carte** : Visualisation des lieux liés sur Leaflet
- **Statut publié/brouillon** : Préparer un guide sans le rendre public

### Pour les administrateurs
- **Interface d'administration sécurisée** : Accès protégé par JWT (`/admin`)
- **Gestion des lieux** :
  - Ajouter, modifier, supprimer des lieux
  - Champs : titre, adresse, **ville**, **pays**, **date de visite**, description, catégorie, note, coordonnées GPS
  - Upload de photos multiples par drag & drop ou sélection (Cloudinary)
  - Géolocalisation automatique depuis l'adresse
  - Description enrichie (éditeur Quill)
- **Gestion des guides** :
  - Builder d'itinéraire jour par jour
  - Ajout d'activités avec horaires et lieux liés
  - Infos pratiques (budget, transport, visa, monnaie, langue)
  - Upload de cover image et photos supplémentaires
  - Toggle publié / brouillon
- **Changement de mot de passe** depuis l'interface

## Stack technique

### Frontend
- **React 18** — Interface utilisateur (SPA monolithique `App.js`)
- **React Router** — Navigation SPA
- **Leaflet / React-Leaflet** — Carte interactive OpenStreetMap
- **Framer Motion** — Animations fluides
- **React Quill** — Éditeur de texte enrichi
- **Lucide React** — Icônes
- **Sonner** — Notifications toast

### Backend
- **FastAPI** — API REST Python
- **MongoDB** — Base de données NoSQL
- **Cloudinary** — Hébergement et CDN des images
- **JWT** — Authentification sécurisée
- **Uvicorn** — Serveur ASGI

### Design (v3.0.0)
- Thème clair élégant
- Fond : `#f5f1ea` / Surface : `#faf8f3`
- Accent : `#c17c5a` (terracotta doux)
- Texte : `#252826`
- Polices : **Cormorant Garant** (titres, logo) + **Jost** (corps)
- Carte : OpenStreetMap standard
- Catégories en couleurs OKLCH

## Installation

### Prérequis
- Node.js 18+
- Python 3.9+
- MongoDB
- Compte Cloudinary (pour les uploads d'images)

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # remplir les variables
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
CLOUDINARY_CLOUD_NAME=votre_cloud_name
CLOUDINARY_API_KEY=votre_api_key
CLOUDINARY_API_SECRET=votre_api_secret
```

### Frontend (`/frontend/.env`)
```env
REACT_APP_API_URL=http://localhost:8001
```

## Structure du projet

```
/
├── backend/
│   ├── server.py          # API FastAPI (lieux + guides)
│   ├── requirements.txt   # Dépendances Python
│   └── .env               # Variables d'environnement
├── frontend/
│   ├── public/
│   │   ├── index.html     # HTML avec meta SEO + fonts
│   │   ├── logo.png       # Favicon
│   │   └── .htaccess      # Redirection SPA (Apache/OVH)
│   ├── src/
│   │   ├── App.js         # Composant principal (toutes les pages)
│   │   ├── App.css        # Styles et animations
│   │   ├── index.js       # Point d'entrée React
│   │   └── index.css      # Variables CSS globales + thème
│   ├── package.json
│   └── .env
└── README.md
```

## API Endpoints

### Authentification
| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/api/auth/login` | — | Connexion admin |
| GET | `/api/auth/verify` | ✓ | Vérifier le token |
| POST | `/api/auth/change-password` | ✓ | Changer le mot de passe |

### Lieux
| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api/places` | — | Liste des lieux (filtre `?category=X`) |
| GET | `/api/places/:id` | — | Détails d'un lieu |
| POST | `/api/places` | ✓ | Créer un lieu |
| PUT | `/api/places/:id` | ✓ | Modifier un lieu |
| DELETE | `/api/places/:id` | ✓ | Supprimer un lieu |

### Guides de Voyage
| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api/guides` | — | Liste des guides publiés |
| GET | `/api/guides/all` | ✓ | Tous les guides (publiés + brouillons) |
| GET | `/api/guides/:id` | — | Détails d'un guide |
| POST | `/api/guides` | ✓ | Créer un guide |
| PUT | `/api/guides/:id` | ✓ | Modifier un guide |
| DELETE | `/api/guides/:id` | ✓ | Supprimer un guide |

### Upload
| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/api/upload` | ✓ | Upload image (multipart) vers Cloudinary |
| POST | `/api/upload-base64` | ✓ | Upload image base64 vers Cloudinary |
| GET | `/api/health` | — | Vérification du serveur |

## Catégories de lieux

| ID backend | Nom affiché | Couleur |
|------------|-------------|---------|
| `accommodation` | Dormir | Bleu-gris OKLCH |
| `restaurant` | Manger | Terracotta OKLCH |
| `activity` | Découvrir | Vert OKLCH |
| `gem` | Partir | Ocre OKLCH |

## Auteurs

Créé avec passion par le duo derrière [@deuxpas_unmonde](https://www.instagram.com/deuxpas_unmonde)

## Licence

© 2026 Deux pas un monde — Tous droits réservés
