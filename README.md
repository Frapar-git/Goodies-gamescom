# Gamescom Goodies

Petite webapp pour trier des goodies Gamescom (style Tinder), avec **import par copier-coller Discord**.

## Fonctionnalités

- **Import Discord** : coller des messages copiés depuis Discord → aperçu → import
- **Swipe** : droite = valider, gauche = archiver (boutons aussi)
- **+ Goodie** : ajout rapide (idéal téléphone)
- **Catalogue** : tous / en attente / validés / archivés, avec site / boutique / stand mis en avant
- **Aperçu image** : récupération automatique de l’image de prévisualisation du lien (Open Graph), sinon URL d’image manuelle
- **Édition** : compléter ou modifier un goodie (URL, image, boutique, localisation du stand)
- **Export CSV** : ouvrable dans Excel ou Google Sheets (inclut url, shop, stand)
- Stockage local dans le navigateur (`localStorage`)

## Utilisation rapide

1. Ouvre `index.html` dans un navigateur (ou déploie sur GitHub Pages).
2. Onglet **Import** → colle des messages Discord (depuis un PC de préférence).
3. Clique **Prévisualiser**, coche ce que tu veux, puis **Importer**.
4. Onglet **Swipe** pour valider / archiver.
5. Onglet **Catalogue** → **Export CSV** → ouvre le fichier dans Google Sheets (*Fichier → Importer*).

### Copier depuis Discord (PC)

1. Ouvre le salon.
2. Sélectionne un ou plusieurs messages.
3. `Ctrl+C` (ou clic droit → Copier).
4. Colle dans l’app.

Sur téléphone, préfère le bouton **+ Goodie**.

## Déploiement GitHub Pages

1. Crée un dépôt GitHub et pousse ce dossier.
2. Settings → Pages → Source : branche `main`, dossier `/` (racine).
3. Ouvre l’URL Pages fournie par GitHub.

> Les données restent dans le navigateur de chaque personne. Pour partager une liste commune, utilise l’**Export CSV** puis importe-le dans un Google Sheet partagé.

## Stack

HTML / CSS / JavaScript (modules ES), sans framework, sans backend.
