# Warlike Browser

Navigateur custom basé sur Electron (moteur Chromium).

## Installation

```bash
npm install
npm start
```

Il te faut **Node.js** installé au préalable (v18+ recommandé).

## Structure

- `main.js` — processus principal Electron, crée la fenêtre
- `preload.js` — pont sécurisé main ↔ renderer
- `index.html` — structure UI (barre onglets, barre nav, webviews)
- `style.css` — thème sombre (noir / bleu nuit / accents rouges)
- `renderer.js` — logique onglets, navigation, raccourcis

## Fonctionnalités incluses

- Onglets multiples avec création / fermeture
- Barre d'URL intelligente (URL ou recherche DuckDuckGo)
- Boutons navigation (retour, avancer, recharger)
- Titre d'onglet auto-synchronisé avec la page
- Raccourcis : `Ctrl+T` (nouvel onglet), `Ctrl+W` (fermer), `Ctrl+L` (focus URL), `Ctrl+R` (recharger)
- Ouverture des liens `_blank` dans un nouvel onglet

## Idées pour aller plus loin

- Favoris (stockage dans un fichier JSON local via `ipcMain`)
- Historique
- Mode incognito (session éphémère)
- Page d'accueil custom avec ton catalogue Warlike Gaming Corps
- Bloqueur de pub (via `webview.session.webRequest`)
- Téléchargements
- Recherche dans la page (`Ctrl+F`)
- Zoom
- Extensions
- Packaging (electron-builder) pour distribuer un `.exe` / `.app` / `.AppImage`

## Build pour distribution

```bash
npm install --save-dev electron-builder
npx electron-builder --win   # ou --mac / --linux
```

## Limites et protections du prototype

**Important :** le code courant utilise des iframes HTML, pas des webviews natives ; de nombreux sites interdisent les iframes. Le conteneur Electron est sandboxé, interdit la navigation de sa fenêtre principale et refuse l'ouverture de fenêtres distantes. Les iframes utilisent une sandbox et la barre d'adresse ne navigue que vers des URLs HTTP(S) sans identifiants intégrés ; certaines applications web ne pourront donc pas fonctionner correctement. Ceci n'est **pas** un navigateur sécurisé ou complet pour des usages sensibles. Les comportements Electron réels doivent être testés sur Windows.
