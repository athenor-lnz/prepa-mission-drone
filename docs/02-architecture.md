# Architecture

## Principes

- site statique sans build : HTML + CSS + modules ES ;
- GitHub Pages ;
- aucun mot de passe ni écran de connexion ;
- Leaflet et polices embarqués dans `vendor/` ;
- routage par hash ;
- logique métier séparée des vues.

## Arborescence

- `src/views/` : Cadre, Zone, Météo, Espace/NOTAM/SUP AIP, MACLOE/SMEPP, Synthèse ;
- `src/lib/` : coordonnées, unités, météo, formulaires, stockage, récapitulatif ;
- `src/services/` : HTTP, géocodage, météo, restrictions UAS, GeoGM/SIA, annuaire, dictée ;
- `src/ui/` : DOM, navigation, modales, toast, dictée ;
- `test/` : tests unitaires.

## Stockage

### Missions
`localStorage` via `pmd.missions.v1`.

### Préférences
`pmd.prefs.v1`.

### Données aéronautiques
IndexedDB `pmd-aerodata-v1` :
- métadonnées AIRAC ;
- espaces GeoJSON préparés ;
- aérodromes.

### Annuaire aéronautique
`localStorage` via `pmd.aircontacts.v1`.

## Modèle de mission

Une mission contient :
- `context` : cadre, image, cas d'usage ;
- `place` : point et rayon ;
- `window` : créneau ;
- `mens` : météo, espace, NOTAM, SUP AIP ;
- `macloe` ;
- `smepp` ;
- `validation.macloe` et `validation.smepp` ;
- `admin` : suivi GENDRONE / Visu@ldrone.

## Données externes

Les services exposent des réponses avec source et horodatage. Une absence de réponse n'est jamais convertie en « rien à signaler ».

## PWA

Le service worker met en cache uniquement la coque de l'application. Les API et tuiles restent réseau ; les missions et la base GeoGM/SIA restent locales.
