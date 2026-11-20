// Accueil de l'appli mobile (et page web sapeuri2.github.io/nihongo-mobile/) : les 4 applis, et les kanji du jour.
// Dans l'appli Android, il envoie au widget le planning d'un mois (window.NihongoAndroid, fourni par l'appli).

import { jourDe, jours, planifier } from './planning.js';
import { chargerKanji, etatKanji, progression } from './kanji.js';

const CLE_WIDGET = 'nm-widget-v1'; // planning du widget (propre à cette page ; ne touche à aucune progression)
const APK = 'https://github.com/Sapeuri2/nihongo-mobile/releases/download/apk/nihongo.apk';
const APPLIS = [
  { id: 'grammaire', nom: 'Grammaire', jp: '文法', dossier: 'nihongo-grammaire', cle: 'ng-state-v1' },
  { id: 'vocabulaire', nom: 'Vocabulaire', jp: '語彙', dossier: 'nihongo-vocabulaire', cle: 'nv-state-v1' },
  { id: 'kanji', nom: 'Kanji', jp: '漢字', dossier: 'nihongo-kanji', cle: 'nk-state-v1' },
  { id: 'exo', nom: 'Challenger', jp: '挑戦', dossier: 'nihongo-exo', cle: 'nx-state-v1' },
];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const lire = (cle, defaut) => { try { return JSON.parse(localStorage.getItem(cle)) ?? defaut; } catch { return defaut; } };
const ecrire = (cle, v) => { try { localStorage.setItem(cle, JSON.stringify(v)); } catch { /* stockage indisponible */ } };
export const android = () => window.NihongoAndroid || null;
const urlAppli = (a, chemin = '') => new URL(`../${a.dossier}/${chemin}`, location.href).href;

function carteKanji(f, rappel) {
  if (!f) return '';
  const lect = [f.kun, f.on].filter(Boolean).join(' · ');
  return `<a class="kj${rappel ? ' rappel' : ''}" href="${esc(urlAppli(APPLIS[2], `#/lecon/${encodeURIComponent(f.lecon)}`))}">
    ${rappel ? '<span class="etiquette">rappel</span>' : ''}<span class="k jp" lang="ja">${esc(f.k)}</span>
    <span class="lect jp" lang="ja">${esc(lect)}</span><span class="sens">${esc(f.sens)}</span></a>`;
}

function vue({ jour, fiches, aujourdhui, niveau, erreur }) {
  const n = APPLIS.map(a => Object.values(lire(a.cle, {})?.lessons || {}).filter(l => l?.done).length);
  let h = '<header class="tete"><h1><span class="jp" lang="ja">日本語</span> Nihongo</h1></header>';
  h += '<section class="carte jour"><div class="titre"><h2>Tes kanji du jour</h2>';
  h += `<span class="muted">${esc(niveau || '')}${aujourdhui?.debutLot && aujourdhui.debutLot !== jour ? ' · 2ᵉ jour' : ''}</span></div>`;
  if (erreur) h += `<p class="muted">${esc(erreur)}</p>`;
  else if (!aujourdhui) h += '<p class="muted">Chargement…</p>';
  else if (!aujourdhui.nouveaux.length && !aujourdhui.rappel) h += '<p class="muted">Rien à afficher : ouvre l’appli Kanji une fois pour récupérer ta progression.</p>';
  else h += `<div class="kanjis">${aujourdhui.nouveaux.map(k => carteKanji(fiches[k])).join('')}${carteKanji(fiches[aujourdhui.rappel], true)}</div>`;
  h += `<p class="muted petit">${android() ? 'Le widget suit ce planning : 3 nouveaux kanji pendant 2 jours, 1 rappel par jour, changement à 6 h.' : `Sur Android, <a href="${APK}">installe l’appli</a> pour avoir ces kanji en widget sur ton écran d’accueil.`}</p></section>`;
  h += '<nav class="applis">';
  APPLIS.forEach((a, i) => {
    h += `<a class="appli ${a.id}" href="${esc(urlAppli(a))}"><span class="jp" lang="ja">${a.jp}</span><span class="nom">${a.nom}</span>
      <span class="muted petit">${a.id === 'exo' ? 'séances IA' : `${n[i]} leçon${n[i] > 1 ? 's' : ''} faite${n[i] > 1 ? 's' : ''}`}</span></a>`;
  });
  h += '</nav>';
  return h;
}

// Calcule le planning (jours passés gardés), l'enregistre, et l'envoie au widget dans l'appli Android.
export function mettreAJour(lecons, maintenant = new Date()) {
  const jour = jourDe(maintenant);
  const ancien = lire(CLE_WIDGET, null);
  const dejaMontres = (ancien?.lots || []).filter(l => l.debut < jour).flatMap(l => l.kanji);
  const { niveau, candidats, pool, fiches } = etatKanji(lecons, progression(), dejaMontres);
  const etat = planifier(ancien, jour, candidats, pool);
  ecrire(CLE_WIDGET, etat);
  const js = jours(etat, jour);
  const utiles = new Set(Object.values(js).flatMap(x => [...x.nouveaux, x.rappel]).filter(Boolean));
  const donnees = { v: 1, maj: maintenant.getTime(), niveau, jours: js, fiches: Object.fromEntries([...utiles].map(k => [k, fiches[k]])) };
  try { android()?.setWidgetKanji(JSON.stringify(donnees)); } catch { /* ancienne version de l'appli */ }
  return { jour, fiches, niveau, aujourdhui: js[jour] };
}

async function main() {
  const app = document.getElementById('app');
  app.innerHTML = vue({ jour: jourDe() });
  try {
    const lecons = await chargerKanji();
    app.innerHTML = vue(mettreAJour(lecons));
  } catch (e) {
    app.innerHTML = vue({ jour: jourDe(), erreur: `Impossible de lire les kanji (${e.message}). Hors ligne ?` });
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Quand on revient sur l'accueil (retour arrière depuis une appli), on recalcule : une leçon a pu être faite.
window.addEventListener('pageshow', e => { if (e.persisted) main(); });
main();
