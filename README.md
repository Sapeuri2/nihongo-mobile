# Nihongo — appli mobile (Android)

Une seule appli pour les 4 applis de japonais (Grammaire, Vocabulaire, Kanji, Challenger), avec un **widget Kanji** :
chaque matin à 6 h, 4 kanji sur l'écran d'accueil, sans ouvrir l'appli (3 nouveaux kanji du niveau en cours qui
restent 2 jours + 1 rappel qui reste 1 jour).

**Installer** : sur le téléphone, ouvrir
https://github.com/Sapeuri2/nihongo-mobile/releases/download/apk/nihongo.apk puis l'installer
(autoriser « sources inconnues » pour le navigateur la première fois). Une nouvelle version s'installe par-dessus
l'ancienne. Widget : appui long sur l'écran d'accueil → Widgets → Nihongo → « Kanji du jour ».

## Comment c'est fait

- `index.html`, `css/`, `js/` : l'**accueil**, publié par GitHub Pages sur https://sapeuri2.github.io/nihongo-mobile/
  (même adresse que les 4 applis : il lit leur progression, sans jamais y écrire). Il calcule le planning du widget
  (`js/planning.js`, `js/kanji.js`) et l'envoie à l'appli (`window.NihongoAndroid.setWidgetKanji`). Planning gardé dans
  `nm-widget-v1` (localStorage).
- `android/` : l'appli (Java, sans bibliothèque) : une page web plein écran sur sapeuri2.github.io (`MainActivity`)
  et le widget (`KanjiWidget`, qui lit le planning d'un mois et change de jour à 6 h, hors ligne).
- Les 4 applis restent les sites existants : leur progression est synchronisée par les mêmes Gists.
- `.github/workflows/apk.yml` : construit l'APK à chaque push sur `main` et le publie au même lien.
- Signature fixe (`android/app/nihongo.keystore`) pour que les mises à jour s'installent par-dessus.

## Vérifier

```
node --test tests/*.test.mjs        # planning du widget
node tests/accueil.mjs              # accueil dans Chromium (contenu Kanji réel, faux pont Android)
cd android && ./gradlew assembleRelease lintRelease
```

Code géré par l'agent central (voir le dépôt `nihongo-central`, `MEMOIRE.md`).
