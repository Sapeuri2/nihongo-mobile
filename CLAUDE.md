# CLAUDE.md — appli mobile nihongo

Dépôt géré par l'**agent central** (code). Avant toute chose, lis `MEMOIRE.md` du dépôt `Sapeuri2/nihongo-central`.
Réponds en français, simple et direct. Ne jamais casser la progression de l'utilisateur : ne jamais écrire dans les clés
des autres applis (`ng-`, `nv-`, `nk-`, `nx-`, `nihongo-ma-liste-…`) ; la clé propre à l'accueil est `nm-widget-v1`.
Garder la même signature Android (`android/app/nihongo.keystore`) et le même `applicationId`, sinon la mise à jour
oblige à désinstaller l'appli (et perd les données de la WebView). Voir `README.md`.
