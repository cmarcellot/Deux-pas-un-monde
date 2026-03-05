# Deux pas un monde

Site web compagnon du compte Instagram [@deuxpas_unmonde](https://www.instagram.com/deuxpas_unmonde) - Un carnet de voyage interactif pour partager nos bonnes adresses.

## Aperçu

"Deux pas un monde" est une plateforme de partage d'adresses de voyage permettant de découvrir des hébergements, restaurants, activités et bonnes adresses à travers une carte interactive ou une liste visuelle.

## Fonctionnalités

### Pour les visiteurs
- **Vue Liste** : Parcourir les lieux sous forme de cartes avec photos, notes et descriptions
- **Vue Carte** : Visualiser tous les lieux sur une carte interactive avec marqueurs colorés par catégorie
- **Filtrage par catégorie** :
  - Hébergements (orange)
  - Restaurants (beige)
  - Activités (vert)
  - Bonnes adresses (gris)
- **Détails en modal** : Consulter les informations complètes d'un lieu sans quitter la page
- **Notation par étoiles** : Voir notre appréciation de chaque lieu (1-5 étoiles)

### Pour les administrateurs
- **Interface d'administration sécurisée** : Accès protégé par mot de passe
- **Gestion complète des lieux** :
  - Ajouter de nouveaux lieux
  - Modifier les informations existantes
  - Supprimer des lieux
  - Upload de photos multiples
- **Géolocalisation** : Définir les coordonnées GPS pour chaque lieu

## Stack technique

### Frontend
- **React 18** - Interface utilisateur
- **React Router** - Navigation SPA
- **Leaflet / React-Leaflet** - Carte interactive
- **Framer Motion** - Animations fluides
- **Sonner** - Notifications toast

### Backend
- **FastAPI** - API REST Python
- **MongoDB** - Base de données NoSQL
- **JWT** - Authentification sécurisée

### Design
- Thème sombre élégant adapté au logo
- Couleur principale : #414441 (gris anthracite)
- Accent : #C66B3D (terracotta)
- Police : Playfair Display (titres) + DM Sans (corps)
- Carte : CartoDB Dark Matter

## Installation

### Prérequis
- Node.js 18+
- Python 3.9+
- MongoDB

### Backend
```bash
cd backend
pip install -r requirements.txt
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
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=deux_pas_un_monde
JWT_SECRET=votre_secret_jwt
ADMIN_PASSWORD=votre_mot_de_passe_admin
```

### Frontend (`/frontend/.env`)
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

## Structure du projet

```
/app
├── backend/
│   ├── server.py          # API FastAPI
│   ├── requirements.txt   # Dépendances Python
│   ├── uploads/           # Photos uploadées
│   └── .env               # Variables d'environnement
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── logo.png       # Favicon
│   ├── src/
│   │   ├── App.js         # Composant principal
│   │   ├── App.css        # Styles
│   │   ├── index.js       # Point d'entrée
│   │   └── index.css      # Styles globaux
│   ├── package.json
│   └── .env
└── README.md
```

## API Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/health` | Vérification du serveur |
| POST | `/api/auth/login` | Connexion admin |
| GET | `/api/auth/verify` | Vérifier le token |
| GET | `/api/places` | Liste des lieux |
| GET | `/api/places?category=X` | Filtrer par catégorie |
| GET | `/api/places/:id` | Détails d'un lieu |
| POST | `/api/places` | Créer un lieu (auth) |
| PUT | `/api/places/:id` | Modifier un lieu (auth) |
| DELETE | `/api/places/:id` | Supprimer un lieu (auth) |
| POST | `/api/upload` | Upload d'image (auth) |

## Catégories disponibles

- `accommodation` - Hébergements
- `restaurant` - Restaurants
- `activity` - Activités
- `gem` - Bonnes adresses

## Auteurs

Créé avec passion par le duo derrière [@deuxpas_unmonde](https://www.instagram.com/deuxpas_unmonde)

## Licence

© 2026 Deux pas un monde - Tous droits réservés
