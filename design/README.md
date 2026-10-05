# Dossier design — direction B « une main »

Conception mobile d'abord : navigation et actions dans la zone du pouce (bas de l'écran), grandes cibles, style moderne.

| Dossier | Contenu |
|---|---|
| `tokens.css` | Variables CSS clair/sombre. **À utiliser directement.** |
| `previews/` | 24 captures PNG (12 écrans × clair/sombre, 390 × 844, ×2). **Référence visuelle rapide.** |
| `screens/` | Sources des 12 écrans (`.dc.html`), chacun avec une propriété `theme` (`light` ou `dark`). |

## Les 12 écrans

`Connexion` · `Accueil` · `AccueilVide` · `Lieu` · `Meteo` (avec seuil de rafales réglable) · `MeteoHS` (météo indisponible, saisie manuelle) · `Espace` (zones) · `Notam` (collage manuel) · `SupAip` (saisie manuelle) · `Fiche` · `Smepp` (dictée) · `Outils` (tiroir de conversion).

## Format `.dc.html`

Ces fichiers sont au format « Design Component » de l'outil de design utilisé. Ils ne s'ouvrent **pas** directement dans un navigateur : ils dépendent d'un script d'exécution (`support.js`) non fourni, et utilisent des marques `{{…}}`.

Utilisation pratique pour l'IA de développement :
- ouvrir d'abord les **captures** de `previews/` ;
- lire le **HTML et le CSS** de chaque `.dc.html` pour reprendre mise en page, tailles, espacements et icônes SVG (styles en ligne ou dans `<helmet><style>`) ;
- le seul gabarit utile est `{{vars}}` : une chaîne de variables CSS posée sur l'élément racine, équivalente à `design/tokens.css` ; le reste est du HTML ordinaire ;
- les valeurs affichées (14 kt, 50 m, LFBO…) sont des **données d'exemple**, à ne jamais recopier comme vraies données.

Les captures et sources font foi pour l'apparence ; `docs/03-ecrans-et-parcours.md` décrit les comportements.

## Ce qui n'est pas encore dessiné

Onglet Coordonnées des Outils, menu d'actions d'une mission (renommer, dupliquer, supprimer), import/export en détail, état hors ligne, tablette et poste de travail (la mise en page B est pensée pour téléphone ; sur grand écran, centrer la colonne mobile ou prévoir une version à deux colonnes).
