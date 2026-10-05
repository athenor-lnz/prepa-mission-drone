# Cahier des charges — Prépa Mission Drone

## Objectif

Guider la préparation d'une mission drone sur smartphone, sans se substituer à l'analyse réglementaire ni à l'autorité d'emploi.

Parcours de référence :

**Cadre → Zone → MENS → MACLOE → SMEPP → Synthèse**

## 1 — Cadre de mission

- nature : police judiciaire, police administrative, sauvegarde de la vie humaine, entraînement, communication ou autre ;
- image : observation, captation ou enregistrement ;
- cas d'usage multiples : catégorie ouverte AE, STS GN 01.1, hors vue 1 km, hors vue 2 km ;
- ces choix servent de contexte : ils ne constituent pas à eux seuls une validation juridique.

## 2 — Zone

- carte Leaflet ;
- fonds Plan OSM, Satellite et OACI-VFR ;
- bouton de géolocalisation et commandes de zoom intégrées ;
- recherche adresse / coordonnées ;
- DD, DDM, DMS et UTM ;
- rayon de travail réglable ;
- si une base GeoGM/SIA locale est disponible, superposition des espaces détectés et aérodromes proches.

## 3 — MENS

### M — Météo
Open-Meteo + Kp NOAA, créneau début/fin, vent, rafales, vent 80 m, visibilité, pluie, nuages, température, seuil de rafales réglable et saisie manuelle de secours.

### E — Espace aérien
- restrictions UAS Géoplateforme ;
- import local du ZIP GeoGM/SIA ;
- extraction de `TOUT/espaces.geojson` et `TOUT/aerodromes.geojson` ;
- analyse des espaces intersectant le **rayon** de mission ;
- aérodromes proches, fréquences et accès VAC/AIP ;
- fond OACI ;
- annuaire aéronautique personnel avec téléphone cliquable ;
- source et date des données affichées.

### N — NOTAM
Consultation officielle via SOFIA-Briefing. L'application permet de reporter les NOTAM utiles. L'absence de saisie n'est jamais interprétée comme « aucun NOTAM ».

### S — SUP AIP
Consultation SIA puis report des SUP AIP utiles. Même règle : absence de saisie ≠ absence de SUP AIP.

## 4 — MACLOE

Ordre : **M → A → C → L → O → E**.

Chaque partie :
- explication opérationnelle ;
- mots-clés / points à penser ;
- exemple ;
- texte libre + dictée si disponible ;
- état À faire / En cours / Validé ;
- validation explicite avant ouverture de la suite.

## 5 — SMEPP

Ordre : **S → M → E → P → P**.

- S : Situation générale + Situation particulière ;
- M : Mission de l'équipe drone ;
- E : **AMICAL complet** :
  - A Articulation,
  - M Mission de chacun,
  - I Itinéraires / cheminements,
  - C Conduite à tenir,
  - A Amis / appuis / renforts,
  - L Liaisons / OCT / comptes rendus ;
- P : Points particuliers ;
- P : Place du chef.

Chaque section devient verte uniquement après validation explicite.

## 6 — Synthèse

- cadre, zone, créneau ;
- MENS ;
- MACLOE et SMEPP ;
- GENDRONE et Visu@ldrone suivis manuellement ;
- export JSON ;
- import ;
- partage natif d'une mission ;
- copie du récapitulatif.

## Exigences

- aucun mot de passe ;
- stockage des missions local au navigateur ;
- base aéronautique locale en IndexedDB ;
- pas de télémétrie ;
- messages et confirmations intégrés à l'interface, pas d'`alert()` navigateur ;
- cibles tactiles ≥ 44 px ;
- thèmes clair et sombre ;
- PWA installable.
