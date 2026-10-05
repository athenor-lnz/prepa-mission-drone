# Dossier design — direction B « une main »

Conception mobile d'abord : navigation et actions dans la zone du pouce (bas de l'écran), grandes cibles, style moderne.

| Dossier | Contenu |
|---|---|
| `tokens.css` | Variables CSS clair/sombre. **À utiliser directement.** |
| `previews/` | 18 captures PNG (9 écrans × clair/sombre, 390 × 844, ×2). **Référence visuelle rapide.** |
| `screens/` | Sources des 9 écrans (`.dc.html`), chacun avec une propriété `theme` (`light` ou `dark`). |

## Les 9 écrans

`Connexion` · `Accueil` · `Lieu` · `Meteo` · `MeteoHS` (météo indisponible, saisie manuelle) · `Espace` (espace aérien, NOTAM, SUP AIP) · `Fiche` · `Smepp` (dictée) · `Outils` (tiroir de conversion).

## Format `.dc.html`

Ces fichiers sont au format « Design Component » de l'outil de design utilisé. Ils ne s'ouvrent **pas** directement dans un navigateur : ils dépendent d'un script d'exécution (`support.js`) non fourni, et utilisent des marques `{{…}}`.

Utilisation pratique pour l'IA de développement :
- ouvrir d'abord les **captures** de `previews/` ;
- lire le **HTML et le CSS** de chaque `.dc.html` pour reprendre mise en page, tailles, espacements et icônes SVG (styles en ligne ou dans `<helmet><style>`) ;
- le seul gabarit utile est `{{vars}}` : une chaîne de variables CSS posée sur l'élément racine, équivalente à `design/tokens.css` ; le reste est du HTML ordinaire ;
- les valeurs affichées (14 kt, 50 m, LFBO…) sont des **données d'exemple**, à ne jamais recopier comme vraies données.

Les captures et sources font foi pour l'apparence ; `docs/03-ecrans-et-parcours.md` décrit les comportements.

## Ce qui n'est pas encore dessiné

NOTAM et SUP AIP en détail (liste, collage du texte), accueil vide, import/export, état hors ligne, tablette et poste de travail (la mise en page B est pensée pour téléphone ; sur grand écran, centrer la colonne mobile ou prévoir une version à deux colonnes).
