# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Un seul utilisateur : un francophone qui apprend le japonais seul pour le JLPT (N5 fini côté kanji, N4 en cours, examen N4
bientôt). Il travaille sur son PC à la maison et sur son téléphone Android (au sport, dans les transports). Sa méthode :
répéter jusqu'à ce que ça reste ; sa crainte : valider sur le moment puis oublier.

## Product Purpose
Quatre applis d'entraînement (Grammaire, Vocabulaire, Kanji, et le Challenger qui pose des séances écrites par une IA)
réunies dans une appli Android, avec un widget qui montre chaque matin 4 kanji du niveau en cours (3 nouveaux pendant
2 jours + 1 rappel). Réussir = il ouvre l'appli tous les jours, reprend sa leçon en un geste et retient sur la durée.

## Positioning
Un parcours fait pour lui seul : leçons courtes en français, répétition espacée, progression partagée entre les 4
applis, et des kanji qui viennent à lui sans ouvrir l'appli.

## Operating Context
Sessions courtes et fréquentes sur téléphone, souvent d'une main ; aussi sur PC. Hors ligne possible. Lecture de
japonais avec furigana (activables), saisie au clavier japonais.

## Capabilities and Constraints
- Sites statiques gratuits (GitHub Pages), en français, PC et téléphone, hors ligne ; appli Android = WebView sur ces
  sites + widget natif. Rien de payant.
- Le même code (moteur commun) sert les 3 applis de cours : le nouveau design s'applique à l'appli ET aux sites.
- Ne jamais casser la progression (clés de stockage, Gists, identifiants inchangés).
- Écran d'accueil de l'appli : d'abord « Continuer ma leçon », les kanji du jour juste dessous.
- Couleurs d'identité des applis : grammaire rouge, vocabulaire bleu, kanji vert, Challenger violet (existantes).

## Brand Commitments
Interface simple, pour lui seul, en français. Pas d'animations qui ralentissent ou distraient (décision de l'utilisateur).

## Product Principles
- Reprendre en un geste : ce qui est à faire maintenant passe avant tout.
- Le japonais d'abord : kanji et furigana lisibles, grands sur téléphone.
- Calme et rapide : pas d'effets, pas d'attente, hors ligne.
- Une seule progression partout : jamais rien de perdu.
