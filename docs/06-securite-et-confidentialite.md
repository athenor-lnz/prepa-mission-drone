# Sécurité et confidentialité

## Le mot de passe commun n'est pas une vraie sécurité

Le site est statique : tout le code, donc le contrôle du mot de passe, est lisible par quiconque ouvre la page. Le verrou sert à **décourager un passage occasionnel**, pas à protéger des données sensibles.

Mise en œuvre (`src/lib/gate.js`) :
- Le dépôt ne contient qu'un **vérificateur** (sel + empreinte **PBKDF2-SHA256**, 200 000 itérations) du mot de passe, jamais le mot de passe.
- La saisie est dérivée dans le navigateur (Web Crypto) et comparée au vérificateur.
- **Web Crypto n'existe qu'en contexte sécurisé** : HTTPS (GitHub Pages convient) ou `localhost`. Ouvert en `file://` ou via une adresse IP locale en HTTP, le verrou ne peut pas fonctionner : afficher un message explicite, ne jamais laisser entrer sans vérification.
- L'état « déverrouillé » (`sessionStorage`) se contourne depuis la console du navigateur : c'est un confort, pas une barrière.
- Changer le mot de passe = régénérer le vérificateur (`scripts/make-verifier.mjs`) et republier.
- Un vérificateur exposé peut être attaqué par force brute : choisir un mot de passe long (phrase de plusieurs mots).

Si un jour il faut une vraie protection : authentification côté serveur ou contrôle d'accès au niveau de l'hébergement. Ne pas réutiliser un mot de passe réel de l'institution.

## Dépôt GitHub

- Dépôt **privé** de préférence. S'il est public : aucune donnée de mission, aucun document interne, aucun extrait de note-express, aucun nom ni numéro réel dans le code, les tests ou les captures.
- Les jeux d'exemple du dépôt sont fictifs (identifiants de type `A0000/26`, adresses génériques).
- Pas de clé d'API, pas de jeton, pas de fichier `.env` commité.

## Données de mission

- Elles restent dans le navigateur de l'utilisateur et ne sont envoyées à aucun serveur de l'application.
- Les appels aux sources externes (météo, géocodage, tuiles) transmettent des coordonnées : le dire dans une page « À propos ». Préférer des sources sans compte ni suivi.
- L'export JSON contient les missions en clair : avertir l'utilisateur.
- Ne pas stocker d'informations classifiées ou protégées : un avertissement doit figurer à côté des champs SMEPP/MACLOE.

## Dictée vocale

La reconnaissance vocale du navigateur (Web Speech API) envoie en général **l'audio à un service distant** (Chrome et Edge). Pour une mission réelle, cela peut poser un problème de confidentialité.
- Afficher un message clair avant la première dictée, avec accord de l'utilisateur.
- Proposer de désactiver la dictée.
- Piste ultérieure : reconnaissance **locale** (modèle exécuté dans le navigateur) pour que l'audio ne quitte pas l'appareil.

## Autres

- Aucune télémétrie ni traceur.
- Politique de contenu stricte (`Content-Security-Policy` en balise `meta`) limitant les domaines aux sources déclarées. **À mettre à jour à chaque source ajoutée** : `connect-src` (géocodage, météo, Kp), `img-src` (tuiles), `font-src` (polices) ; sans cela le navigateur bloque les appels.
- Import JSON : valider le format (`prepa-mission-drone/missions@1`), les types et les tailles ; refuser un fichier invalide au lieu d'écraser les missions existantes ; échapper tout texte affiché.
- Échapper tout texte affiché provenant d'une source externe (NOTAM, vigilance).
