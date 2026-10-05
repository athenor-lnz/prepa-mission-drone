# Design system — direction B « une main »

Direction : application **mobile d'abord**, utilisable d'une main en extérieur. Tout ce qui se touche est dans la moitié basse de l'écran ; le haut n'affiche que du contexte. Style moderne : grands arrondis, cartes flottantes, très gros chiffres pour les verdicts. Pas d'emoji ni de dégradé décoratif.

## Principe de la zone du pouce

- **Haut de l'écran** : retour (48 px) et indicateur d'étapes (1 Lieu · 2 Météo · 3 Espace · 4 Fiche). Information, pas d'action fréquente.
- **Milieu** : contenu et carte.
- **Bas** : tout ce qu'on touche souvent. Bouton principal pleine largeur de 64 px (« Valider · Météo »), réglages (heures, valeurs), micro de dictée, pavé numérique des outils.
- Le bouton principal est toujours **au même emplacement** d'un écran à l'autre.

## Typographies (Google Fonts, à embarquer en local si possible)

| Usage | Famille | Graisses |
|---|---|---|
| Titres, boutons principaux, grands chiffres | Sora | 600 / 700 |
| Texte | Manrope | 500 / 600 / 700 |
| Données, coordonnées, heures, valeurs | JetBrains Mono | 500 |

Tailles : texte 15 px ; libellés 12 px capitales espacées (`letter-spacing: .1em`) ; titre d'écran 24–38 px ; verdict 60 px ; valeur saisie 46 px.

## Couleurs (source de vérité : `design/tokens.css`)

| Rôle | Clair | Sombre |
|---|---|---|
| `--bg` fond | `#EEF0EA` | `#090D12` |
| `--surf` cartes | `#FFFFFF` | `#131A22` |
| `--surf2` champs, segments | `#F2F4EE` | `#1B242E` |
| `--line` séparateurs | `#DDE1D6` | `#2A3541` |
| `--field-line` bordure de champ | `#7B8576` | `#6B7C8E` |
| `--ink` texte | `#0D1218` | `#EEF3F7` |
| `--mute` texte secondaire | `#566170` | `#9AA9B8` |
| `--acc` accent | `#2340E8` | `#B9F23A` |
| `--accInk` texte sur accent | `#FFFFFF` | `#0B1304` |
| `--accSoft` | `#E3E8FF` | `#232F0C` |
| `--go` / `--goSoft` | `#0D7A40` / `#D8F1E1` | `#3EE58C` / `#0F2E1E` |
| `--warn` / `--warnSoft` | `#8A5200` / `#FBE9C6` | `#FFB020` / `#34260A` |
| `--bad` / `--badSoft` | `#B3261E` / `#F9DAD6` | `#FF7A6E` / `#3A1814` |

Contrastes calculés : texte secondaire 6,3:1 (clair) et 7,3:1 (sombre) sur les cartes ; accent clair 7,1:1 sur blanc ; texte sur accent sombre 14,3:1 ; statuts sur leur fond doux de 4,5:1 (vert, thème clair) à 9:1 ; bordures de champ ≥ 3:1.

**Règles** : jamais de couleur codée en dur dans un composant ; le statut ne repose jamais sur la couleur seule (toujours un mot : GO, LIMITE, Zone contrôlée) ; dans le thème sombre, l'accent (vert citron) et le vert GO sont deux couleurs distinctes : le vert GO ne sert qu'aux statuts.

## Formes et espacements

- Marges de page 20 px. Écart entre cartes 10–12 px.
- Rayons : cartes 24 px, boutons principaux 22 px, champs et boutons carrés 16 px, feuille du bas 32 px, pastilles 99 px.
- Ombre de carte : clair `0 6px 24px rgba(13,18,24,.10)` ; sombre `0 6px 24px rgba(0,0,0,.45)`.
- Écran de référence : 390 × 844. Sur écran plus large, centrer une colonne de 480 px maximum.

## Composants

- **Bouton principal** : 64 px, texte Sora 17–18 px gras, fond `--acc`. Un seul par écran.
- **Bouton carré** (retour, thème, outils, copier) : 48 à 64 px, rayon 16–22 px, fond `--surf`.
- **Pas-à-pas − / +** : 48 px, pour régler heures, vent, rafales, visibilité sans clavier.
- **Segments** (DD · DDM · DMS · UTM, Zones · NOTAM · SUP AIP, Plan · Satellite) : conteneur arrondi, hauteur 44–48 px, actif en `--ink` sur fond `--surf`.
- **Indicateur d'étapes** : pastilles 30 px ; faite = vert avec ✓, active = accent avec libellé, à venir = gris.
- **Feuille du bas** (Lieu, Outils) : coins hauts à 32 px, poignée, contenu défilant.
- **Carte de verdict** : fond doux de la couleur du statut, mot en 60 px, valeur « 14 / 20 kt », jauge avec repère à 85 %.
- **Tuile de mesure** : libellé 12 px, valeur Sora 28 px, unité en mono, ligne d'explication.
- **Pavé numérique** : touches de 54 px, grille 3 colonnes, virgule décimale.
- **Micro de dictée** : rond 96 px, rouge pendant l'écoute, anneau pulsant (`@keyframes pulse`, désactivé si `prefers-reduced-motion`), forme d'onde, précédent/suivant de part et d'autre.
- **Alerte** : fond doux du statut, icône 24 px, texte 14 px gras.
- **Carte à bord pointillé** : donnée non disponible ou non vérifiée (NOTAM, SUP AIP).

## Accessibilité

Cibles ≥ 48 px ; contrastes ci-dessus ; focus visible (contour 3 px d'accent) ; éléments natifs (`button`, `input`, `label`) ; `aria-label` sur tous les boutons-icônes ; `aria-current="step"` sur l'étape active ; `role="alert"` sur les erreurs ; `prefers-reduced-motion` respecté ; sens porté aussi par le texte.

## Icônes

Traits 2–2,6 px, `stroke-linecap: round`, 20–24 px, `currentColor`. Aucun emoji.
