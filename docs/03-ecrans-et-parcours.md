# Écrans et parcours — direction B « une main »

Références visuelles : `design/previews/` (12 écrans × clair/sombre) et `design/screens/` (sources). Les maquettes utilisent des **données d'exemple** : ne pas les recopier comme vraies données.

## Parcours principal

```
Connexion → Accueil → [Nouvelle mission | Ouvrir une mission]
  → 1 Lieu → 2 Météo → 3 Espace aérien (zones · NOTAM · SUP AIP) → 4 Fiche mission
        → SMEPP (dictée)   → retour Fiche
        → MACLOE (dictée)  → retour Fiche
        → GENDRONE / Visu@ldrone (statuts à la main)
Outils (feuille du bas) accessible depuis Lieu et la Fiche.
```

« MENS » = **M**étéo, **E**space aérien, **N**OTAM, **S**UP AIP (à confirmer par le porteur). Les étapes sont des pastilles : on peut revenir sur n'importe laquelle. « Valider » et « Retour » sont des raccourcis, pas des verrous.

## Disposition commune

- **Haut** : bouton retour (48 px) + indicateur d'étapes (✓ faite, accent active avec libellé, grises à venir).
- **Bas** : un bouton principal de 64 px nommant la suite (« Valider · Météo », « Valider · Espace aérien », « Valider · Fiche mission »), précédé au besoin des réglages de l'écran.
- Colonne unique de 390 px de référence ; au-delà de 480 px, centrer.

## 01 Connexion (`Connexion`)

Moitié haute : identité (radar décoratif, logo, nom). Moitié basse : champ mot de passe avec libellé, bouton œil (afficher), message d'erreur `role="alert"` (« Mot de passe incorrect. Réessayez. »), avertissement « verrou léger, aucune information classifiée », bouton « Entrer ».

## 02 Accueil (`Accueil`)

Titre « Missions », compteur, filtres (Toutes · À préparer · Prêtes). Cartes de mission : nom, date · créneau · lieu, pastille de verdict (GO / LIMITE / À PRÉPARER), 4 segments de progression (Lieu, Météo, Espace, Fiche), pastilles GENDRONE et Visu@ldrone. En bas : « Nouvelle mission » (principal) et import/export. Actions de carte à prévoir : renommer, dupliquer, supprimer (appui long ou menu). État vide : écran `AccueilVide` (invitation « Prêt pour une première mission », rappel que le cache peut être vidé, « Importer une sauvegarde » et « Nouvelle mission »).

## 03 Lieu (`Lieu`)

- Carte plein cadre en haut ; repère central et rayon de travail (pointillés) ; bascule Plan · Satellite en bas à gauche de la carte ; bouton « Me localiser » à droite.
- Feuille du bas : recherche (adresse ou coordonnées, bouton dictée), segments DD · DDM · DMS · UTM, valeur en police à chasse fixe avec bouton Copier (56 px), bouton Outils et « Valider · Météo ».
- Thème clair = plan ; thème sombre = satellite (les vraies tuiles remplacent le dessin).

## 04 Météo (`Meteo`)

- Carte de verdict : créneau, heure de mise à jour, **GO / LIMITE / NO-GO** en 60 px, « rafales max / seuil », jauge avec repère à 85 %.
- 3 tuiles : vent (kt, direction), rafales, Kp.
- Graphique des rafales heure par heure : créneau surligné, seuil en tirets, barres colorées par statut.
- Alerte (vigilance) : fond d'avertissement, avec précision « dans / hors créneau ».
- Bas : réglage Début et Fin par pas de 30 minutes, puis « Valider · Espace aérien ».
- **Seuil de rafales réglable** dans l'en-tête du graphique (− / + par pas de 1 nœud) ; le verdict et les couleurs des barres se recalculent.

## 05 Météo indisponible (`MeteoHS`)

Carte rouge « Météo indisponible, aucune valeur n'est inventée » + « Réessayer » ; saisie manuelle du vent, des rafales et de la visibilité par pas-à-pas ; verdict recalculé et libellé « Verdict manuel ». Même logique pour toute source en panne.

## 06 Espace aérien, NOTAM, SUP AIP (`Espace`)

- Bandeau : « Zone contrôlée » (ambre) ou « Hors zone contrôlée » (vert) ; il passe en **rouge** si une zone interdite ou dangereuse est touchée.
- Mini-carte des zones (CTR en ambre pointillé, zone restreinte en rouge).
- Carte de lignes : CTR (oui/non), hauteur maximale, aérodrome le plus proche (distance) ; pied « Source … données récupérées à hh:mm ».
- Carte à bord pointillé « NOTAM · SUP AIP : non vérifiés » tant qu'aucune source n'est branchée : **jamais « rien à signaler » sans source**.
- Segments Zones · NOTAM · SUP AIP au-dessus du bouton principal. Les onglets NOTAM et SUP AIP ouvrent les écrans `Notam` et `SupAip`, ci-dessous.

### 06 bis NOTAM (`Notam`) et SUP AIP (`SupAip`)

- Carte à bord pointillé « non vérifiés » tant qu'aucune source n'est branchée ; rappel que l'absence de texte ne signifie pas « rien à signaler ».
- **NOTAM** : étape 1 « Ouvrir le service NOTAM du SIA » (lien externe), étape 2 « copier le texte de la zone et le coller » ; zone de texte monospace, bouton « Enregistrer le texte » ; chaque texte enregistré affiche son identifiant, la pastille « Saisi à la main · hh:mm » et la validité.
- **SUP AIP** : lien vers le site du SIA ; formulaire Identifiant · Validité · Titre, bouton « Ajouter » ; chaque entrée affiche identifiant, titre, validité, pastille « Saisi à la main · hh:mm » et « Ouvrir le document ».
- Toujours indiquer la source (ici « saisie manuelle ») et l'heure d'enregistrement.

## 07 Fiche mission (`Fiche`)

Synthèse (Lieu ✓ avec coordonnées, Météo avec verdict, Espace avec statut) ; deux cartes SMEPP (n / 9) et MACLOE (n / 6) avec progression et micro ; GENDRONE (À faire · Envoyée · Acceptée) et Visu@ldrone (À faire · Déclaré · Clos) en sélecteurs à trois états ; rappel « statuts suivis à la main ». Bas : Exporter et « Copier le récapitulatif ».

## 08 SMEPP / MACLOE en dictée (`Smepp`)

- En-tête : retour, titre, « n / N champs », barre de progression.
- Rail S · M · E · P · P (fait = vert, en cours = accent, à faire = neutre), cible 56 × 52 px.
- Carte du champ actif : section, titre, aide, texte dicté avec texte provisoire grisé et curseur, pastille « Écoute 00:12 ».
- Bas : forme d'onde, micro rond 96 px au centre (rouge, pulsation), champ précédent à gauche, suivant à droite, phrase de confidentialité (« audio traité par le service de dictée du navigateur »).

## 09 Outils (`Outils`)

Feuille du bas sur fond assombri : segments Coordonnées · Unités, catégories (Longueur · Vitesse · Pression), grande valeur saisie avec sélecteur d'unité, lignes de résultats avec bouton Copier, **pavé numérique** à l'écran (pas de clavier système). Onglet Coordonnées à dessiner (champ, quatre formats, « Utiliser comme lieu »).

## États transverses à prévoir

Chargement (squelettes), erreur de source (modèle `MeteoHS`), hors ligne, champ vide, stockage indisponible, navigateur sans dictée vocale, import de fichier invalide.
