# Sources de données

> **Tous les endpoints ci-dessous sont des pistes, non vérifiées au moment de la rédaction.** L'IA de développement doit tester chacun (disponibilité, CORS, format, conditions d'utilisation) et consigner le résultat dans la colonne « Vérifié ».
> **Légende de la colonne « Vérifié »** : ☐ non vérifié · ◐ joignable depuis un serveur mais à confirmer **depuis le navigateur** (CORS) · ☑ vérifié de bout en bout. Open-Meteo : test automatique bloqué (robots.txt), à tester depuis le navigateur.
> Contrainte : le site est statique sur GitHub Pages, donc **aucune clé d'API dans le code**. Source sans clé, ou petit relais (par exemple un Worker) si une clé est indispensable.

| Besoin | Piste de source | Remarques | Vérifié |
|---|---|---|---|
| Géocodage d'adresses en France | API de géocodage de la Géoplateforme IGN (`data.geopf.fr/geocodage/search?q=…`), successeur annoncé de l'API Adresse (BAN, `api-adresse.data.gouv.fr`) | Sans clé. Vérifier laquelle est active et le format de réponse. Couvre l'outre-mer à confirmer (Nouméa). | ◐ joignable le 06/10/2026 depuis un serveur ; **CORS et couverture outre-mer non testés** |
| Fond Satellite | Géoplateforme IGN, WMTS (`data.geopf.fr/wmts`), couche `ORTHOIMAGERY.ORTHOPHOTOS` | Sans clé. Attribution IGN obligatoire. | ☐ |
| Fond Plan | OpenStreetMap (`tile.openstreetmap.org`) ou Plan IGN (`GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2`) | Respecter la politique d'usage des tuiles OSM (usage modéré, attribution). Plan IGN en repli. | ☐ |
| Météo (vent, rafales, direction, température, pluie, visibilité, nuages) | Open-Meteo (`api.open-meteo.com/v1/forecast`), variables `wind_speed_10m`, `wind_gusts_10m`, `wind_direction_10m`, `temperature_2m`, `precipitation_probability`, `visibility`, `cloud_cover` | Sans clé, CORS ouvert. Vérifier les conditions d'usage pour un service institutionnel. Vent en altitude (80/120/180 m) selon disponibilité. Alternative : API Météo-France (clé requise). | ☐ |
| Alertes météo (vigilance) | Météo-France (portail API ou flux de vigilance) | Probablement une clé : prévoir un relais ou une saisie manuelle en V1. | ☐ |
| Indice Kp | NOAA SWPC, produits JSON (`services.swpc.noaa.gov/products/noaa-planetary-k-index*.json`) | Sans clé, CORS généralement ouvert. | ◐ joignable le 06/10/2026 depuis un serveur ; **CORS non testé** |
| METAR / TAF (optionnel) | aviationweather.gov, API de données | CORS à vérifier, relais possible. | ☐ |
| Zone contrôlée et restrictions | Couche « restrictions UAS » de la Géoplateforme (`TRANSPORTS.DRONES.RESTRICTIONS`, WMTS/WFS) ; données SIA (AIXM, publication en GeoJSON) | Test point-dans-polygone côté navigateur. Les données SIA peuvent être embarquées et mises à jour à la main (cycle AIRAC). Afficher la **date de validité du jeu de données**. | ☐ |
| NOTAM | Aucune API ouverte évidente en France | **Décision à prendre avec le porteur** : (a) lien direct vers le service du SIA + zone de collage du texte, (b) relais vers un service existant, (c) saisie manuelle. Ne jamais déclarer « aucun NOTAM » sans source. | ☐ |
| SUP AIP | Site du SIA (publication des SUP AIP) ; site Sup'AIP France | Sans API connue : lien vers le document + saisie manuelle de l'identifiant, du titre et de la validité en V1. | ☐ |

## Règles d'intégration

- Chaque service renvoie `{ ok, data, source, fetchedAt }` ou `{ ok:false, error, manualAllowed }` (voir `02-architecture.md`).
- Convertir en unités internes (m/s, m, hPa, degrés) ; l'affichage dans l'unité choisie passe par `src/lib/units.js`.
- Cache court (≈ 10 min) ; bouton « Actualiser » visible ; horodatage affiché.
- Toujours un repli : saisie manuelle des valeurs, qui alimentent le même verdict.
- Les heures de la mission sont en Europe/Paris (ou fuseau du lieu, ex. Pacific/Noumea) ; les APIs renvoient en UTC ou en heure locale : convertir explicitement et tester le changement d'heure.
- **Outre-mer** : prévoir le fuseau du lieu (Nouvelle-Calédonie, UTC+11) et vérifier la couverture de chaque source.
