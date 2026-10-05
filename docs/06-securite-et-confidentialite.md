# Sécurité et confidentialité

## Pas d'authentification

Cette application ne comporte **aucun mot de passe** et aucun système d'authentification. Le précédent verrou client a été supprimé.

Un site statique GitHub Pages ne doit pas être considéré comme un espace sécurisé pour des données sensibles.

## Données de mission

- stockage local dans le navigateur ;
- export JSON en clair ;
- ne pas saisir de donnée classifiée ou protégée ;
- la suppression du cache du navigateur peut supprimer les missions ;
- export recommandé avant changement d'appareil.

## Données aéronautiques

Le ZIP GeoGM/SIA importé est traité dans le navigateur et conservé en IndexedDB. L'analyse locale ne constitue pas une autorisation de vol.

## Services externes

Météo, géocodage et tuiles reçoivent les coordonnées nécessaires à leur fonctionnement.

## Dictée vocale

Selon le navigateur, la Web Speech API peut transmettre l'audio à un service distant. L'application demande un consentement avant la première dictée. Ne pas dicter d'information sensible.

## Dépôt

Aucun secret, clé d'API, donnée réelle de mission ou document interne ne doit être commité.

## CSP

La Content-Security-Policy limite les ressources et connexions aux domaines nécessaires. Toute nouvelle source doit être ajoutée explicitement.
