# Mise en service

1. **Mot de passe** (désactivé pour l'instant : `gateEnabled = false` dans `src/config.js`, passer à `true` pour réactiver) : `node scripts/make-verifier.mjs "votre phrase de 12 caractères ou plus"`, coller le résultat dans `src/config.js`. Le mot de passe provisoire fourni à la livraison doit être changé ainsi. Le dépôt étant public, tout le monde peut lire le code : ce verrou n'est pas une sécurité.
2. **GitHub Pages** : Settings → Pages → source = la branche à publier (HTTPS obligatoire pour le verrou, la dictée et le PWA).
3. **Dépôt** : passer en privé si l'hébergement le permet.
4. **Tests** : `npm test` (aucune dépendance). Test local : `python3 -m http.server` puis http://localhost:8000.
5. **À vérifier sur téléphone** : carte, recherche d'adresse, météo réelle, restrictions UAS, dictée, installation « sur l'écran d'accueil ».
