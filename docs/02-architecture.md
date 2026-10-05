# Architecture

## Choix

- **Site statique** sans build : HTML + CSS + modules ES natifs. Déploiement GitHub Pages direct.
- **Carte** : Leaflet (léger, simple, tuiles XYZ/WMTS). Embarquer la bibliothèque dans le dépôt (`vendor/`) pour ne pas dépendre d'un CDN, souvent bloqué sur les réseaux internes.
- **Géométrie** : point-dans-polygone et distances écrits à la main ou via une petite bibliothèque embarquée (type Turf, modules ciblés).
- **Routage** : par ancre (`#/mission/<id>/lieu`), ce qui marche sur GitHub Pages sans configuration.
- **Aucun framework** requis. Si l'IA juge indispensable d'en ajouter un (Preact, par exemple), elle le justifie et le vendorise.

## Arborescence cible

```
/
├─ index.html
├─ design/tokens.css           # thèmes (source de vérité des couleurs)
├─ src/
│  ├─ main.js                  # démarrage, routeur, verrou
│  ├─ lib/
│  │  ├─ geo.js                # parse + DD / DDM / DMS / UTM
│  │  ├─ units.js              # conversions
│  │  ├─ verdict.js            # GO / Prudence / NO-GO
│  │  ├─ storage.js            # missions (localStorage), export/import
│  │  └─ gate.js               # verrou mot de passe (PBKDF2-SHA256)
│  ├─ views/                   # une vue par écran (accueil, lieu, mens, fiche, forme)
│  ├─ components/              # carte, onglets MENS, champ dicté, tuiles…
│  ├─ services/                # météo, kp, espace aérien, notam, supaip, géocodage
│  └─ speech.js                # dictée (Web Speech API)
├─ vendor/                     # Leaflet, etc.
├─ test/
└─ docs/
```

## Modèle de données (une mission)

```json
{
  "id": "m_20261006_ab12",
  "name": "Reconnaissance de site",
  "createdAt": "2026-10-05T19:30:00Z",
  "updatedAt": "2026-10-05T19:45:00Z",
  "place": { "label": "12 rue du Taur, Toulouse", "lat": 43.6045, "lon": 1.4442, "radiusM": 500 },
  "window": { "start": "2026-10-06T09:00", "end": "2026-10-06T12:00", "tz": "Europe/Paris" },
  "mens": {
    "meteo": { "gustLimitMs": 12, "fetchedAt": null, "source": null, "manual": false, "slots": [] },
    "espace": { "fetchedAt": null, "source": null, "controlled": null, "zones": [] },
    "notam": { "fetchedAt": null, "source": null, "items": [] },
    "supaip": { "fetchedAt": null, "source": null, "items": [] }
  },
  "smepp": { "S1": "", "S2": "", "M": "", "E1": "", "E2": "", "E3": "", "E4": "", "P1": "", "P2": "" },
  "macloe": { "M": "", "A": "", "C": "", "L": "", "O": "", "E": "" },
  "admin": { "gendrone": "todo", "visualdrone": "todo" }
}
```

Statuts : `gendrone` ∈ `todo | sent | validated` ; `visualdrone` ∈ `todo | declared`.
Les dates sont stockées avec fuseau explicite. Les coordonnées en WGS 84 décimal.

## Stockage

- Clé `pmd.missions.v1` : tableau de missions. Clé `pmd.prefs.v1` : thème, unités, seuil de rafales par défaut. Clé de session `pmd.unlocked`.
- Un numéro de version dans le nom de clé ; prévoir une fonction de migration.
- `localStorage` peut être effacé : **export/import JSON** obligatoire dès la phase 1.
- Toute lecture/écriture est protégée par `try/catch` (navigation privée, stockage bloqué) ; en cas d'échec, l'application reste utilisable en mémoire et prévient l'utilisateur.

## Services de données

Chaque service expose la même forme de réponse :

```js
{ ok: true,  data: ..., source: "Open-Meteo", fetchedAt: "2026-10-06T08:12:00Z" }
{ ok: false, error: "Source indisponible", manualAllowed: true }
```

L'interface n'affiche jamais une donnée sans sa source et son heure. Les appels sont mis en cache brièvement (quelques minutes) pour éviter les rappels inutiles.

## Qualité

- Tests unitaires `node --test` sur tout `src/lib/`.
- Pas de dépendance exécutée côté navigateur sans être vendorisée.
- Accessibilité : éléments natifs (`button`, `label`, `input`), `aria-label` sur les boutons-icônes.
