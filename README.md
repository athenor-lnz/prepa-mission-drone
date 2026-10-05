# Prépa Mission Drone — `design-b-mobile`

Application web **mobile-first**, pensée pour une utilisation à une main sur smartphone, pour préparer une mission drone de gendarmerie.

Cette branche conserve la direction visuelle **B** mais intègre le parcours et les fonctions métier validés :

**Cadre → Zone → MENS → MACLOE → SMEPP → Synthèse**

## État actuel

- design clair/sombre mobile-first ;
- carte Leaflet : **Plan OSM / Satellite / OACI-VFR** ;
- géolocalisation + zoom intégrés dans la carte ;
- météo automatique via **Open-Meteo** + indice **Kp NOAA** ;
- restrictions UAS via Géoplateforme ;
- import local du ZIP **GeoGM/SIA** :
  - `espaces.geojson`,
  - `aerodromes.geojson`,
  - métadonnées AIRAC ;
- détection des espaces qui intersectent le **rayon de mission** ;
- affichage des aérodromes proches, fréquences et accès **VAC / AIP** ;
- NOTAM : consultation **SOFIA-Briefing** + saisie contrôlée ;
- SUP AIP : consultation SIA + saisie contrôlée ;
- MACLOE guidé avec rappels, exemples et validation **M → A → C → L → O → E** ;
- SMEPP guidé avec validation **S → M → E → P → P** et **AMICAL complet** dans Exécution ;
- export / import JSON ;
- partage natif d'une mission sur mobile ;
- PWA avec cache de la coque applicative ;
- aucune télémétrie.

## Pas de mot de passe

Le verrou par mot de passe a été **retiré entièrement** de cette branche.

Les missions restent stockées localement dans le navigateur. Le dépôt et l'hébergement ne doivent donc pas être considérés comme un système de protection de données sensibles.

## Données aéronautiques locales

Dans **MENS → Espace aérien**, importer une fois le ZIP GeoGM/SIA, par exemple :

`geogm-sia-tous-territoires-2026-10-01.zip`

L'application extrait côté navigateur les jeux `TOUT/espaces.geojson` et `TOUT/aerodromes.geojson`, puis les conserve dans **IndexedDB** sur l'appareil.

Lors d'un nouveau cycle AIRAC, il suffit d'importer le nouveau ZIP.

L'analyse locale est une **aide à la préparation** : elle ne remplace pas les publications officielles SIA, les NOTAM, les SUP AIP ni les consignes d'un organisme ATS.

## Développement

```bash
npm test
```

Aucun build n'est requis : HTML, CSS et modules ES natifs.

La CI de la branche vérifie :
- la syntaxe de tous les fichiers JS ;
- les tests unitaires.

## Architecture

- `src/views/` : écrans et parcours ;
- `src/lib/` : logique pure et testable ;
- `src/services/` : météo, géocodage, restrictions UAS, GeoGM/SIA, dictée ;
- `src/ui/` : composants DOM, navigation, toasts, modales ;
- `design/` : direction artistique B et références visuelles ;
- `test/` : tests unitaires.

## Déploiement

Branche cible : **`design-b-mobile`**.

Pour GitHub Pages : publier la racine de cette branche en HTTPS.
