# Feuille de route

S'arrêter à la fin de chaque phase pour validation.

## Phase 0 — Socle
- Dépôt, `index.html`, `design/tokens.css`, thèmes clair/sombre avec bascule mémorisée.
- Verrou par mot de passe (`gate.js`), routeur par ancre, barre supérieure.
- Accueil : liste des missions, nouvelle mission, renommer/dupliquer/supprimer, export/import JSON.
- Déploiement GitHub Pages.
- **Terminé quand** : on peut se connecter, créer, retrouver et supprimer une mission après rechargement, dans les deux thèmes, sur téléphone.

## Phase 1 — Lieu et Outils
- Carte Leaflet : Satellite + Plan, repère, rayon, clic sur la carte.
- Recherche d'adresse (source vérifiée), saisie de coordonnées multi-formats.
- Affichage et copie DD / DDM / DMS / UTM.
- Tiroir Outils : coordonnées et unités.
- **Terminé quand** : un point à Toulouse et un point en Nouvelle-Calédonie donnent des coordonnées correctes dans les 4 formats.

## Phase 2 — MENS : Météo
- Barre de créneau (début, fin), service météo, tuiles, courbe, tableau, alertes (ou saisie manuelle).
- Seuil de rafales réglable, verdict (`verdict.js`).
- **Terminé quand** : le verdict change correctement quand on déplace le seuil ou le créneau, et la panne de source est gérée.

## Phase 3 — Fiche, SMEPP, MACLOE, dictée
- Fiche mission, statuts GENDRONE et Visu@ldrone, récapitulatif à copier.
- Formulaires SMEPP et MACLOE, progression, copie.
- Dictée par champ (Web Speech API fr-FR), message de confidentialité, repli sans dictée.
- **Terminé quand** : on remplit un SMEPP entier à la voix sur téléphone et on le copie.

## Phase 4 — MENS : Espace aérien, NOTAM, SUP AIP
- Zone contrôlée oui/non, restrictions, hauteur max, aérodrome proche, carte des zones.
- NOTAM et SUP AIP selon la décision prise (lien + collage, ou source).
- **Terminé quand** : chaque affichage porte sa source et son horodatage, et l'absence de donnée n'est jamais présentée comme « rien à signaler ».

## Phase 5 — Confort
- PWA hors ligne (service worker), impression/PDF de la fiche mission, dictée locale (étude), versions mobiles affinées, audit d'accessibilité.

## État d'avancement (06/10/2026)
Phases 0 à 4 codées sur cette branche, plus le PWA de base de la phase 5 (service worker, manifeste). Vérifié : 57 tests unitaires, parcours complet dans Chromium (iPhone 390×844, clair et sombre, API simulées), aucune erreur console.
**Non vérifié** (le bac à sable n'atteint pas ces services) : CORS réel d'Open-Meteo, Géoplateforme (géocodage et WFS), NOAA, Nominatim ; tuiles Esri ; dictée vocale réelle ; affichage sur un vrai téléphone. Un échec réseau ouvre toujours la saisie manuelle.
Choix assumés : NOTAM, SUP AIP, alertes météo et « zone contrôlée » sont saisis à la main (aucune source ouverte fiable) ; hors France métropolitaine la couche de restrictions UAS n'est pas interrogée (« non vérifié »). Reste à faire : impression/PDF, audit d'accessibilité sur appareil.
