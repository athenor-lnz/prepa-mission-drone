# Prépa Mission Drone — branche `design-b-mobile`

Application web **mobile d'abord, utilisable d'une main**, d'aide à la préparation d'une mission drone, pour un usage en unité de gendarmerie. Cette branche est **indépendante** de `main` (aucun historique commun) : elle porte la direction de design B et un dossier de transfert complet pour une IA de développement ou un développeur.

> Statut : **maquettes B dessinées** (12 écrans, thèmes clair et sombre) ; code applicatif à écrire. Seuls des modules utilitaires testés sont fournis (`src/lib/`, 32 tests).

## Ordre de lecture

1. `docs/PROMPT-IA.md` : consigne prête à coller dans l'IA qui va développer.
2. `docs/01-cahier-des-charges.md` : ce que fait l'application, module par module, avec critères d'acceptation.
3. `docs/03-ecrans-et-parcours.md` : chaque écran, ses états, ses comportements (direction B).
4. `docs/04-design-system.md` + `design/tokens.css` + `design/previews/` : zone du pouce, couleurs, typographies, composants (clair et sombre).
5. `docs/02-architecture.md` : stack, arborescence, modèle de données, stockage.
6. `docs/05-sources-de-donnees.md` : météo, espace aérien, NOTAM, SUP AIP, cartes, géocodage (statut de vérification de chaque source).
7. `docs/06-securite-et-confidentialite.md` : mot de passe commun, dépôt GitHub, dictée vocale.
8. `docs/07-feuille-de-route.md` : phases de livraison.

## Contenu

| Dossier | Rôle |
|---|---|
| `docs/` | Spécifications en français |
| `design/tokens.css` | Variables CSS des thèmes clair et sombre (prêtes à utiliser) |
| `design/previews/` | 24 captures PNG : 12 écrans × clair/sombre |
| `design/screens/` | Sources des 12 écrans (format `.dc.html`, voir `design/README.md`) |
| `src/lib/` | Modules JS purs et testés : coordonnées, unités, verdict météo, stockage des missions, verrou par mot de passe |
| `test/` | Tests (`node --test`) |
| `index.html`, `src/main.js` | Coquille de démarrage : verrou + page d'accueil minimale |

## Démarrer

```bash
# tests des modules
node --test

# servir en local (HTTPS ou localhost obligatoire pour le verrou : Web Crypto)
python3 -m http.server 8000
```

Aucune étape de build n'est requise : modules ES natifs, déployable tel quel sur GitHub Pages.

## Maquettes en ligne

Canevas de design de la direction B : https://claude.ai/artifact/QcA6Up6UCAnqx4oKZYhB53 (privé, lisible seulement par son propriétaire). Les captures et sources sont dans `design/`.

## Points à confirmer par le porteur

- **MENS** : interprété comme **M**étéo, **E**space aérien, **N**OTAM, **S**UP AIP.
- Source des NOTAM et SUP AIP (aucune API ouverte évidente en France, voir `docs/05`).
- Nom définitif de l'application et du dépôt.
- **Dépôt public** : n'y mettre aucune donnée de mission, aucun document interne, aucun secret (voir `docs/06`). Passer le dépôt en privé dès que possible.
