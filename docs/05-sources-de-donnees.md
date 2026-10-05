# Sources de données

## Sources intégrées

| Besoin | Source | Usage |
|---|---|---|
| Géocodage | Géoplateforme, repli Nominatim | Recherche d'adresse / coordonnées |
| Plan | OpenStreetMap | Fond cartographique |
| Satellite | Esri World Imagery | Fond cartographique |
| OACI-VFR | Géoplateforme / DSNA-SIA | Fond OACI |
| Météo | Open-Meteo | Vent, rafales, visibilité, pluie, nuages, température |
| Kp | NOAA SWPC | Indice géomagnétique |
| Restrictions UAS | Géoplateforme WFS | Restriction cartographiée au point mission |
| Espaces aériens | ZIP GeoGM/SIA AIXM → `TOUT/espaces.geojson` | Analyse des espaces intersectant le rayon |
| Aérodromes | ZIP GeoGM/SIA AIXM → `TOUT/aerodromes.geojson` | Aérodromes proches, fréquences, VAC/AIP |
| NOTAM | SOFIA-Briefing | Consultation officielle, puis report manuel |
| SUP AIP | SIA | Consultation officielle, puis report manuel |

## GeoGM/SIA

Le ZIP de référence contient notamment :

- `sortie/TOUT/espaces.geojson`
- `sortie/TOUT/aerodromes.geojson`
- `sortie/index.json`

L'import se fait côté navigateur. Les données sont préparées puis conservées dans IndexedDB.

La date `effective` issue de `index.json` doit être affichée à l'utilisateur.

## VAC / AIP

Pour chaque aérodrome disposant d'un code ICAO, l'application propose un accès à la recherche officielle SIA VAC/AIP.

L'application ne prétend pas embarquer ni republier les cartes VAC elles-mêmes.

## Règles d'intégration

- chaque donnée externe affiche sa source et, lorsque pertinent, son horodatage ;
- cache court pour les API ;
- saisie manuelle de secours quand une source est indisponible ;
- aucune donnée aéronautique n'est inventée ;
- l'analyse locale GeoGM/SIA est une aide à la préparation ;
- NOTAM et SUP AIP nécessitent une consultation officielle ;
- outre-mer : privilégier la base GeoGM/SIA locale lorsque la couche Géoplateforme ne couvre pas le territoire.
