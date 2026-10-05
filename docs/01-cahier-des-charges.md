# Cahier des charges

## 1. Objectif

Guider un télépilote ou un chef de mission dans la préparation d'un vol : choisir le lieu, vérifier **MENS**, renseigner **SMEPP** et **MACLOE**, puis suivre ses démarches **GENDRONE** (demande de vol) et **Visu@ldrone** (déclaration de vol).

Utilisateurs : personnels de gendarmerie d'une unité disposant de drones. Contexte d'usage : bureau, véhicule, terrain (plein soleil, nuit, gants). Chaque utilisateur travaille sur ses propres missions, stockées dans son navigateur.

## 2. Hors périmètre de la version 1

- Aucune communication avec GENDRONE ni Visu@ldrone : l'application aide à préparer et copier les informations, l'utilisateur les saisit lui-même et marque le statut à la main.
- Aucun compte individuel, aucun serveur applicatif, aucune synchronisation entre appareils (hors export/import de fichier).
- Aucune décision réglementaire automatique : le verdict météo aide, il ne remplace ni l'analyse de risque ni l'autorisation d'emploi.

## 3. Modules et critères d'acceptation

### M0 — Accès (verrou par mot de passe commun)
- Écran de connexion avec un champ mot de passe et un bouton « Entrer ».
- Le mot de passe est le même pour tous. Il n'est jamais écrit en clair dans le code (voir `docs/06`).
- Le déverrouillage est mémorisé pour la session du navigateur ; un bouton permet de verrouiller.
- Mauvais mot de passe : message « Mot de passe incorrect », pas de blocage dur.

### M1 — Accueil et missions
- Bouton principal « Nouvelle mission ».
- Liste des missions enregistrées (nom, lieu, date, statut) triées de la plus récente à la plus ancienne ; ouvrir, renommer, dupliquer, supprimer (avec confirmation).
- Export de toutes les missions en un fichier JSON, import avec fusion.
- Sauvegarde automatique à chaque modification.

### M2 — Lieu
- Carte avec **fond Satellite** et **fond Plan OSM**, bascule entre les deux.
- Recherche d'adresse en France (autocomplétion) **ou** saisie de coordonnées (décimal, DDM, DMS, UTM acceptés en entrée).
- Toucher la carte déplace le repère. Un rayon de travail (par défaut 500 m, réglable) est tracé autour du point.
- Affichage de la position en **DD, DDM, DMS, UTM (WGS 84)**, avec bouton « Copier » pour chacun.
- Accepté : un point en métropole et un point en outre-mer (Nouvelle-Calédonie, par exemple) doivent fonctionner.

### M3 — Outils (menu accessible partout)
- **Coordonnées** : saisie libre, conversion dans les 4 formats, copier, « Utiliser comme lieu de la mission ».
- **Unités** : longueur/altitude (m, km, ft, NM, SM), vitesse (m/s, km/h, kt, mph), pression (hPa, inHg, mmHg). Saisie d'une valeur, choix de l'unité source, résultats dans toutes les autres, copier.
- Extensible (niveaux de vol, °C/°F) sans refonte.

### M4 — MENS (4 onglets M, E, N, S)
Barre commune : lieu, **date et heure de début**, **date et heure de fin**.

**M — Météo** (sur le créneau)
- Vent moyen, rafales, direction, indice **Kp**, visibilité, plafond, température, probabilité de pluie, **alertes** (vigilance).
- Valeurs affichées en m/s et en nœuds ; unités au choix de l'utilisateur.
- **Seuil de rafales** réglable ; **verdict** GO / Prudence / NO-GO calculé sur toutes les heures du créneau (voir `src/lib/verdict.js`).
- Courbes vent/rafales avec ligne de seuil ; tableau heure par heure avec statut.
- Si la source est indisponible : message clair, saisie manuelle possible.

**E — Espace aérien** (comme un outil de type Flyby)
- Réponse immédiate : « Zone contrôlée » ou « Hors zone contrôlée » au point choisi.
- Liste des restrictions et zones touchant le point (CTR, TMA, R, D, P, ZIT, sites sensibles…), avec limites verticales et horaires d'activité.
- Hauteur maximale applicable, aérodrome le plus proche et distance.
- Carte avec les zones tracées.

**N — NOTAM**
- NOTAM de la zone et du créneau, avec identifiant, texte, validité, distance au point.
- Filtres : sur le créneau / dans la zone / tous.

**S — SUP AIP**
- SUP AIP en vigueur concernant la zone, avec titre, validité, lien vers le document source.

Pour E, N, S : afficher **la source et l'heure de récupération**. Ne jamais présenter une absence de donnée comme « rien à signaler ».

### M5 — Fiche mission
- Synthèse (lieu, position, créneau) et état des quatre volets MENS.
- Boutons **SMEPP** et **MACLOE** avec progression « n / N champs ».
- **GENDRONE** et **Visu@ldrone** : statut suivi à la main (À faire → Envoyée → Validée pour GENDRONE ; À faire → Déclaré pour Visu@ldrone), bouton « Copier le récapitulatif ».

### M6 — SMEPP et MACLOE avec dictée vocale
- **SMEPP** : Situation générale ; Situation particulière ; Mission de l'équipe drone ; Exécution (articulation du dispositif ; mission de chaque militaire ; conduite à tenir ; amis, liaison OCT / CR) ; Points particuliers (contraintes, environnement, ERP) ; Place du chef.
- **MACLOE** (vol hors vue) : Mission ; Allure ; Cheminement ; Ligne de débouché ; Objectif ; Esquive.
- Chaque champ est un texte libre avec un **bouton micro** : toucher pour dicter, retoucher pour arrêter ; le texte reconnu s'ajoute à la fin du champ ; le texte provisoire est visible en gris pendant l'écoute.
- Langue de dictée : `fr-FR`. Si le navigateur ne la prend pas en charge, masquer le micro et le dire.
- Tout champ reste éditable au clavier. « Copier le texte » exporte le SMEPP/MACLOE complet.
- Navigation par lettre (S, M, E, P, P) avec progression par section.

### M7 — Thèmes et confort
- Thème **clair** et **sombre** (`design/tokens.css`), bascule par bouton, mémorisée, par défaut selon `prefers-color-scheme`.
- Cibles tactiles ≥ 44 px, contrastes ≥ 4,5:1, utilisable au clavier, libellés pour lecteurs d'écran.

## 4. Exigences non fonctionnelles

- Chargement rapide, fonctionne en connexion dégradée ; les missions et les derniers résultats restent consultables hors ligne (phase PWA).
- Aucune télémétrie, aucun traceur.
- Compatibilité : dernières versions de Firefox, Chrome/Edge, Safari mobile.
