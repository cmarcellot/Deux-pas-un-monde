# Deux pas un monde - PRD

## Problème Original
Site web pour accompagner le compte Instagram voyage "Deux pas un monde". Afficher des lieux visités (hébergements, restaurants, activités, bonnes adresses) sur une carte interactive et en liste, avec interface admin pour publier facilement.

## Architecture
- **Frontend**: React 18 + Leaflet (carte) + Framer Motion (animations)
- **Backend**: FastAPI + MongoDB
- **Auth**: JWT avec mot de passe simple

## User Personas
1. **Visiteurs**: Followers Instagram qui découvrent les bonnes adresses
2. **Admins**: Le couple qui publie les lieux visités

## Core Requirements (Static)
- [x] Vue carte interactive avec marqueurs colorés par catégorie
- [x] Vue liste des lieux avec cartes cliquables
- [x] Toggle carte/liste
- [x] Filtrage par catégorie (Hébergements, Restaurants, Activités, Bonnes adresses)
- [x] Notation étoiles 1-5
- [x] Page détail lieu avec galerie photos
- [x] Interface admin protégée par mot de passe
- [x] CRUD complet des lieux (créer, lire, modifier, supprimer)
- [x] Upload photos

## What's Been Implemented (March 2026)
- Backend FastAPI complet avec tous les endpoints
- Frontend React avec design "Sophisticated Explorer" (dark theme)
- Carte Leaflet avec tuiles CartoDB Dark Matter
- Système d'authentification JWT
- Interface admin complète
- 3 lieux de test ajoutés en base

## Prioritized Backlog
### P0 (Done)
- MVP complet fonctionnel

### P1 (Future)
- Recherche par nom/ville
- Partage social (lien direct vers un lieu)
- Mode hors-ligne pour les voyages

### P2 (Future)
- Commentaires des visiteurs
- Tri par date/note
- Géolocalisation automatique

## Credentials
- Admin password: `deuxpasunmonde2024`
