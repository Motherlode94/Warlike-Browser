# WarLike Browser — Chromium Desktop

WarLike Browser possède deux modes distincts :

- **Desktop Windows (Electron)** : onglets intégrés avec les WebViews Chromium, barre d'adresse et navigation directe dans l'application. Ces onglets ne sont pas des iframes.
- **Web (Cloudflare Pages)** : interface de démonstration. Les sites qui refusent d'être intégrés dans des iframes, notamment Google, ne peuvent pas être chargés dans cette version. Cette restriction ne peut pas être corrigée en modifiant les en-têtes de WarLike.

## Exécuter sur Windows

Installer Node.js, puis depuis le dossier du dépôt :

```powershell
npm install
npm run check
npm start
```

## Installer sans Node.js

Le workflow GitHub Actions [WarLike Browser Windows package](.github/workflows/windows.yml), lancé sur `main` ou manuellement depuis l'onglet **Actions** (Run workflow), construit deux fichiers Windows non signés :
- un installateur NSIS ;
- une édition portable exécutable.

Une fois la compilation réussie, télécharger l'artefact **WarLike-Browser-Windows-unsigned** depuis la page d'exécution GitHub Actions.

Ces binaires ne sont **pas signés numériquement** ; Windows SmartScreen peut afficher un avertissement. Ne pas désactiver les protections système pour forcer une installation non vérifiée.

## Code

- `index.html`, `css/style.css` : interface
- `script/renderer.js` : onglets, recherches, navigation
- `script/main.js` : fenêtre et sécurité Electron
- `script/preload.js` : pont restreint et détection Desktop
- `tests/navigation.test.mjs` : tests de régression

## Limitations connues

Le packaging n'est pas une preuve de compatibilité de tous les sites : tester le rendu, les connexions, la navigation, les téléchargements et les permissions sous Windows. Electron exige des mises à jour de sécurité Chromium régulières. Le projet n'est pas encore un navigateur destiné aux opérations sensibles et ne possède pas de signature de code, de moteur d'extensions complet ni de dispositif de mises à jour automatiques.

Le site Cloudflare n'est pas le moteur de navigation Windows. Il ne faut pas tenter de contourner les protections anti-iframe des sites distants.

## Corrections de navigation 0.2.1

Les panneaux d’accueil et d’erreur sont masqués dès qu’une page est affichée ; aucun panneau vide ne doit intercepter les clics. Les pages Web intégrées conservent leur origine pour charger leurs modules et utiliser leur stockage, et peuvent demander le plein écran ou le verrouillage du pointeur.

Sur Windows, les liens ouvrant une nouvelle fenêtre créent un onglet WarLike. Retour/Avancer utilisent l’historique Chromium, y compris après une redirection. Les pages distantes ne reçoivent ni Node.js ni le pont de l’interface.

Ces corrections ne transforment pas Cloudflare Pages en moteur Chromium distant : les sites qui interdisent les iframes restent indisponibles dans la version Web. Aucun proxy ni serveur de navigation distant n’est configuré sur ce projet.

`npm run check` couvre aussi le panneau masqué, la navigation native, les nouveaux onglets et les URL locales avec port. Le rendu réel de l’application Electron sous Windows reste à valider sur Windows.
