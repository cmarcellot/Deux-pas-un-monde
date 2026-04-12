# Deux pas un monde

Site web compagnon du compte Instagram [@deuxpas_unmonde](https://www.instagram.com/deuxpas_unmonde) — Un carnet de voyage interactif pour partager nos bonnes adresses et guides de voyage.

## Aperçu

"Deux pas un monde" est une plateforme de partage d'expériences de voyage permettant de découvrir des hébergements, restaurants, activités et bonnes adresses à travers une carte interactive ou une liste visuelle, ainsi que des guides de voyage complets avec itinéraires jour par jour.

## Fonctionnalités

### Pour les visiteurs
- **Vue Liste** : Parcourir les lieux sous forme de cartes avec photos, notes et descriptions
- **Vue Carte** : Visualiser tous les lieux sur une carte interactive avec marqueurs colorés par catégorie
- **Filtrage par catégorie** :
  - Hébergements (terracotta)
  - Restaurants (beige)
  - Activités (vert)
  - Bonnes adresses (gris)
- **Détails en modal** : Consulter les informations complètes d'un lieu sans quitter la page
- **Galerie photos** : Lightbox avec navigation clavier et tactile
- **Notation par étoiles** : Appréciation de chaque lieu (1 à 5 étoiles)

### Guides de Voyage
- **Page `/guides`** : Bibliothèque de guides avec filtres par tag
- **Tags disponibles** : Aventure, Culture, Gastronomie, Nature, Famille, City Break, Road Trip
- **Page détail guide** avec 4 onglets :
  - **Itinéraire** : Accordéons jour par jour avec activités, horaires et conseils
  - **Infos pratiques** : Budget estimé, meilleures saisons, transports, visa, monnaie, langue
  - **Photos** : Galerie avec lightbox
  - **Carte** : Visualisation des lieux liés sur Leaflet
- **Statut publié/brouillon** : Préparer un guide sans le rendre public

### Pour les administrateurs
- **Interface d'administration sécurisée** : Accès protégé par JWT
- **Gestion des lieux** (onglet Lieux) :
  - Ajouter, modifier, supprimer des lieux
  - Upload de photos multiples (Cloudinary)
  - Géolocalisation GPS
  - Description enrichie (éditeur Quill)
- **Gestion des guides** (onglet Guides de voyage) :
  - Builder d'itinéraire jour par jour
  - Ajout d'activités avec horaires et lieux liés
  - Sélection de tags et saisons recommandées
  - Infos pratiques (budget, transport, visa, monnaie, langue)
  - Upload de cover image et photos supplémentaires
  - Toggle publié / brouillon
- **Changement de mot de passe** depuis l'interface

## Stack technique

### Frontend
- **React 18** — Interface utilisateur
- **React Router** — Navigation SPA
- **Leaflet / React-Leaflet** — Carte interactive
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

### Design
- Thème sombre élégant
- Couleur principale : `#C66B3D` (terracotta)
- Fond : `#2d302d` (gris anthracite)
- Texte : `#E8E0D5` (crème)
- Police : Playfair Display (titres) + DM Sans (corps)
- Carte : CartoDB Dark Matter

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
│   │   ├── index.html     # HTML avec meta SEO
│   │   ├── logo.png       # Favicon
│   │   └── .htaccess      # Redirection SPA (Apache/OVH)
│   ├── src/
│   │   ├── App.js         # Composant principal (toutes les pages)
│   │   ├── App.css        # Styles et animations
│   │   ├── index.js       # Point d'entrée React
│   │   └── index.css      # Variables CSS globales
│   ├── package.json
│   └── .env
├── design_guidelines.json # Système de design
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
| GET | `/api/guides` | — | Liste des guides publiés (filtre `?tag=X`) |
| GET | `/api/guides/all` | ✓ | Tous les guides (publiés + brouillons) |
| GET | `/api/guides/:id` | — | Détails d'un guide |
| POST | `/api/guides` | ✓ | Créer un guide |
| PUT | `/api/guides/:id` | ✓ | Modifier un guide |
| DELETE | `/api/guides/:id` | ✓ | Supprimer un guide |

### Upload
| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/api/upload` | ✓ | Upload image vers Cloudinary |
| GET | `/api/health` | — | Vérification du serveur |

## Catégories de lieux

| ID | Nom | Couleur |
|----|-----|---------|
| `accommodation` | Hébergements | `#C66B3D` |
| `restaurant` | Restaurants | `#E8E0D5` |
| `activity` | Activités | `#4CAF50` |
| `gem` | Bonnes adresses | `#A0A0A0` |

## Tags de guides

`aventure` · `culture` · `gastronomie` · `nature` · `famille` · `city-break` · `road-trip`

## Auteurs

Créé avec passion par le duo derrière [@deuxpas_unmonde](https://www.instagram.com/deuxpas_unmonde)

## Licence

© 2026 Deux pas un monde — Tous droits réservés
