# PrépaMission Drone

Application web **mobile-first** dédiée à la préparation de missions drone.

## Liens

- **Dépôt GitHub** : https://github.com/athenor-lnz/prepa-mission-drone
- **Branche de développement** : https://github.com/athenor-lnz/prepa-mission-drone/tree/mobile-premium-v1
- **Pull Request V1 mobile premium** : https://github.com/athenor-lnz/prepa-mission-drone/pull/1
- **URL web prévue avec GitHub Pages** : https://athenor-lnz.github.io/prepa-mission-drone/  
  > GitHub Pages n'est pas encore activé sur le dépôt.

## Objectif

PrépaMission Drone doit permettre de préparer une mission depuis un smartphone avec un parcours guidé et une cartographie centrale.

Ordre de préparation :

**Cadre → Zone → MENS → MACLOE → SMEPP → Synthèse**

## Fonctionnalités actuellement présentes

- Interface pensée en priorité pour smartphone
- Thèmes clair et sombre
- Carte Leaflet avec fonds **OSM**, **Satellite** et **OACI-VFR 2026** (DSNA/SIA via Géoplateforme)
- Positionnement de la zone de mission
- Altitude prévue et rayon de travail
- Choix multiple des cas d'usage
- MENS :
  - Météo
  - Espace aérien
  - NOTAM
  - SUP AIP
- MACLOE guidé avec rappels
- SMEPP guidé avec rappels
- SMEPP en accordéon avec états **À faire / En cours / Validé**
- Annuaire aéronautique local avec téléphones cliquables, fréquences et association zone/ICAO
- Recherche rapide **VAC / AIP** sur le site du SIA
- Synthèse de la mission
- Enregistrement local dans le navigateur
- Export JSON
- Import JSON
- Partage natif de la mission sur mobile

## Stockage

Les préparations sont actuellement stockées **localement dans le navigateur** via `localStorage`.

Aucune base distante n'est utilisée dans cette première version.

## Sécurité / authentification

⚠️ **Ne pas stocker un mot de passe directement dans le JavaScript côté client.**

Un mot de passe écrit dans `app.js`, même masqué ou haché, peut être récupéré ou contourné par une personne ayant accès au site ou au dépôt.

La version actuelle de la branche `mobile-premium-v1` **ne contient pas encore d'authentification par mot de passe**.

Pour une vraie protection d'accès, l'authentification devra être placée **devant l'application** (par exemple Cloudflare Access ou une solution serveur équivalente), sans secret embarqué dans le code statique.

## Développement

Branche active :

```text
mobile-premium-v1
```

La branche `main` reste volontairement minimale tant que la première version mobile n'est pas validée.


## Sources aéronautiques intégrées

- Export SIA/AIXM fourni pour le cycle du **01/10/2026** : utilisé comme base pour les premiers contacts extraits des remarques de zones.
- Fond **Carte OACI-VFR 2026** : couche `GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN-OACI` diffusée via la Géoplateforme.
- Cartes VAC / AIP : ouverture de la recherche officielle du **Service de l'Information Aéronautique (SIA)** à partir d'un code ICAO ou d'un identifiant de zone.

Les contacts ajoutés manuellement sont conservés localement sur l'appareil et peuvent accompagner un export de mission.
