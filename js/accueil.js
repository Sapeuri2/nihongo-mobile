// Accueil de l'appli mobile (et page web sapeuri2.github.io/nihongo-mobile/) : les 4 applis, et les kanji du jour.
// Dans l'appli Android, il envoie au widget le planning d'un mois (window.NihongoAndroid, fourni par l'appli).

import { jourDe, jours, planifier } from './planning.js';
import { chargerCours, etatKanji, progression } from './kanji.js';
import { etatLigne, ligneAContinuer } from './lignes.js';

const CLE_WIDGET = 'nm-widget-v1'; // planning du widget (propre à cette page ; ne touche à aucune progression)
const APK = 'https://github.com/Sapeuri2/nihongo-mobile/releases/download/apk/nihongo.apk';
const APPLIS = [
  { id: 'grammaire', nom: 'Grammaire', lettre: 'G', dossier: 'nihongo-grammaire', cle: 'ng-state-v1' },
  { id: 'vocabulaire', nom: 'Vocabulaire', lettre: 'V', dossier: 'nihongo-vocabulaire', cle: 'nv-state-v1' },
  { id: 'kanji', nom: 'Kanji', lettre: 'K', dossier: 'nihongo-kanji', cle: 'nk-state-v1' },
  { id: 'exo', nom: 'Challenger', lettre: 'X', dossier: 'nihongo-exo', cle: 'nx-state-v1' },
];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const lire = (cle, defaut) => { try { return JSON.parse(localStorage.getItem(cle)) ?? defaut; } catch { return defaut; } };
const ecrire = (cle, v) => { try { localStorage.setItem(cle, JSON.stringify(v)); } catch { /* stockage indisponible */ } };
export const android = () => window.NihongoAndroid || null;
const urlAppli = (a, chemin = '') => new URL(`../${a.dossier}/${chemin}`, location.href).href;

function carteKanji(f, rappel) {
  if (!f) return '';
  const lect = f.kun || f.on;
  return `<a class="kj${rappel ? ' rappel' : ''}" href="${esc(urlAppli(APPLIS[2], `#/lecon/${encodeURIComponent(f.lecon)}`))}">
    <span class="c jp" lang="ja">${esc(f.k)}</span><span class="l jp" lang="ja">${esc(lect)}</span><span class="s">${esc(f.sens)}</span></a>`;
}

const pct = (a, b) => (b ? `${Math.round((a / b) * 100)} %` : '');
const code = (a, n) => `${a.lettre} ${String(n).padStart(2, '0')}`;

// Le billet du jour : de la dernière leçon faite vers la prochaine, sur la ligne utilisée le plus récemment.
function billet(x) {
  const { appli: a, etat: e } = x;
  const p = e.prochaine;
  const cases = String(p.num).padStart(3, '0');
  return `<section class="billet ${a.id}" aria-label="Billet du jour">
    <div class="trajet">
      <div class="gare"><small>de</small><b>${e.avant ? code(a, e.avant.num) : '—'}</b><small>${esc(e.avant?.titre || 'départ')}</small></div>
      <span class="fleche" aria-hidden="true"><svg width="22" height="14" viewBox="0 0 22 14"><path d="M1 7h19M14 1l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      <div class="gare droite"><small>vers</small><b>${code(a, p.num)}</b><small>${esc(a.nom)}${e.niveau ? ` · ${esc(e.niveau)}` : ''}</small></div>
    </div>
    <p class="titre-l">${esc(p.titre)}</p>
    <div class="cases"><span class="chiffres">${[...cases].map(c => `<span>${c}</span>`).join('')}</span><em>ligne ${a.lettre} · ${pct(e.faites, e.total)} du parcours</em></div>
    <a class="btn" href="${esc(urlAppli(a, `#/lecon/${encodeURIComponent(p.id)}`))}">Composter : continuer la leçon</a>
  </section>`;
}

function ligneCourte(x) {
  const { appli: a, etat: e } = x;
  if (a.id === 'exo') {
    const bilans = Object.values(lire(a.cle, {})?.bilans || {}).sort((u, v) => (v.t || 0) - (u.t || 0));
    const b = bilans[0];
    return `<a class="ligne ${a.id}" href="${esc(urlAppli(a))}"><b>${a.lettre}</b><span><span class="n">${a.nom}</span>
      <span class="d">${b ? `dernière séance ${b.score.ok}/${b.score.total}` : 'séances écrites par l’IA'}</span></span><span class="d">${b ? pct(b.score.ok, b.score.total) : ''}</span></a>`;
  }
  const lien = e?.prochaine ? urlAppli(a, `#/lecon/${encodeURIComponent(e.prochaine.id)}`) : urlAppli(a);
  return `<a class="ligne ${a.id}" href="${esc(lien)}"><b>${e?.prochaine ? code(a, e.prochaine.num) : a.lettre}</b><span><span class="n">${a.nom}</span>
    <span class="d">${e ? `${e.niveau ? `${esc(e.niveau)} · ` : ''}${e.dues} à revoir` : 'chargement…'}</span></span><span class="d">${e ? pct(e.faites, e.total) : ''}</span></a>`;
}

function vue({ jour, fiches, aujourdhui, erreur, lignes = [] }) {
  const cont = ligneAContinuer(lignes);
  const dues = lignes.reduce((s, x) => s + (x.etat?.dues || 0), 0);
  let h = '<header class="tete"><h1>Nihongo</h1></header>';
  if (cont) h += billet(cont);
  h += `<div class="titre"><h2>Kanji du jour</h2><span>${aujourdhui?.debutLot && aujourdhui.debutLot !== jour ? '2ᵉ jour sur 2' : '1er jour sur 2'}</span></div>`;
  if (erreur) h += `<p class="muted">${esc(erreur)}</p>`;
  else if (!aujourdhui) h += '<p class="muted">Chargement…</p>';
  else if (!aujourdhui.nouveaux.length && !aujourdhui.rappel) h += '<p class="muted">Rien à afficher : ouvre l’appli Kanji une fois pour récupérer ta progression.</p>';
  else h += `<div class="kanjis">${aujourdhui.nouveaux.map(k => carteKanji(fiches[k])).join('')}${carteKanji(fiches[aujourdhui.rappel], true)}</div>`;
  if (!android()) h += `<p class="muted petit">Sur Android, <a href="${APK}">installe l’appli</a> pour avoir ces kanji en widget sur ton écran d’accueil.</p>`;
  h += `<div class="titre"><h2>Mes lignes</h2><span>${dues ? `${dues} à revoir` : ''}</span></div>`;
  const autres = APPLIS.map(a => lignes.find(x => x.appli.id === a.id) || { appli: a }).filter(x => x !== cont);
  h += `<nav class="lignes">${autres.map(ligneCourte).join('')}</nav>`;
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

let lignes = [];
async function chargerLignes() {
  const cours = await Promise.all(APPLIS.filter(a => a.id !== 'exo').map(a => chargerCours(`../${a.dossier}/`).then(l => [a, l]).catch(() => [a, null])));
  lignes = cours.map(([a, l]) => ({ appli: a, lecons: l, etat: l ? etatLigne(l, lire(a.cle, {})) : null }));
  lignes.push({ appli: APPLIS[3], etat: null });
  return lignes;
}

async function main() {
  const app = document.getElementById('app');
  app.innerHTML = vue({ jour: jourDe(), lignes });
  try {
    await chargerLignes();
    const kanji = lignes.find(x => x.appli.id === 'kanji')?.lecons;
    if (!kanji) throw new Error('contenu Kanji introuvable');
    app.innerHTML = vue({ ...mettreAJour(kanji), lignes });
  } catch (e) {
    app.innerHTML = vue({ jour: jourDe(), erreur: `Impossible de lire les kanji (${e.message}). Hors ligne ?`, lignes });
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Quand on revient sur l'accueil (retour arrière depuis une appli), on recalcule : une leçon a pu être faite.
window.addEventListener('pageshow', e => { if (e.persisted) main(); });
main();
