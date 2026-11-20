// Accueil de l'appli mobile (et page web sapeuri2.github.io/nihongo-mobile/) : les 4 applis, et les kanji du jour.
// Dans l'appli Android, il envoie au widget le planning d'un mois (window.NihongoAndroid, fourni par l'appli).

import { jourDe, jours, lotDuJour, planifier, remplacerLot, tirerNouveaux } from './planning.js';
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

const ICONE_MELANGER = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h3.5c2 0 3.2 1 4.3 2.7l2.4 4.6c1.1 1.7 2.3 2.7 4.3 2.7H21M3 17h3.5c1.2 0 2.1-.4 2.9-1.1M15.1 8.1c.8-.7 1.7-1.1 2.9-1.1H21M18 4l3 3-3 3M18 14l3 3-3 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICONE_CHOISIR = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM15 16.5l2 2 3.5-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// Choisir soi-même les 3 nouveaux kanji du lot en cours, parmi tous ceux du niveau (appris ou non).
function vueChoix(x) {
  if (!x) return '<p class="muted">Chargement…</p>';
  const n = choisis.size;
  let h = `<header class="tete"><a class="retour" href="#/" aria-label="Retour à l'accueil"><svg width="24" height="24" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a><h1>Choisir mes kanji</h1></header>`;
  h += `<p class="muted petit">Touche 3 kanji du ${esc(x.niveau)}. Ils restent sur le widget jusqu’au changement prévu ${x.fin ? `(le ${esc(x.fin)} à 6 h)` : ''}. Le rappel reste automatique. En vert : pas encore appris.</p>`;
  h += `<div class="grille">${x.duNiveau.map(k => {
    const f = x.fiches[k];
    return `<button class="choix${choisis.has(k) ? ' on' : ''}${x.appris.has(k) ? ' appris' : ''}" data-act="cocher" data-k="${esc(k)}" aria-pressed="${choisis.has(k)}">
      <span class="c jp" lang="ja">${esc(k)}</span><span class="s">${esc(f?.sens || '')}</span></button>`;
  }).join('')}</div>`;
  h += `<div class="valider"><button class="btn" data-act="valider-choix" ${n === 3 ? '' : 'disabled'}>${n === 3 ? 'Mettre ces 3 kanji sur le widget' : `Encore ${3 - n} à choisir`}</button></div>`;
  return h;
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
  else {
    h += `<div class="kanjis">${aujourdhui.nouveaux.map(k => carteKanji(fiches[k])).join('')}${carteKanji(fiches[aujourdhui.rappel], true)}</div>`;
    h += `<div class="outils"><button class="btn-sec" data-act="melanger">${ICONE_MELANGER}Mélanger</button>
      <a class="btn-sec" href="#/choisir">${ICONE_CHOISIR}Choisir mes kanji</a></div>`;
  }
  if (!android()) h += `<p class="muted petit">Sur Android, <a href="${APK}">installe l’appli</a> pour avoir ces kanji en widget sur ton écran d’accueil.</p>`;
  h += `<div class="titre"><h2>Mes lignes</h2><span>${dues ? `${dues} à revoir` : ''}</span></div>`;
  const autres = APPLIS.map(a => lignes.find(x => x.appli.id === a.id) || { appli: a }).filter(x => x !== cont);
  h += `<nav class="lignes">${autres.map(ligneCourte).join('')}</nav>`;
  return h;
}

// Calcule le planning (jours passés gardés), l'enregistre, et l'envoie au widget dans l'appli Android.
// remplacer : 'melanger' (3 autres au hasard) ou une liste de 3 kanji choisis ; null = simple mise à jour.
export function mettreAJour(lecons, maintenant = new Date(), remplacer = null) {
  const jour = jourDe(maintenant);
  let ancien = lire(CLE_WIDGET, null);
  const dejaMontres = (ancien?.lots || []).filter(l => l.debut < jour).flatMap(l => l.kanji);
  const { niveau, candidats, pool, fiches, duNiveau, appris } = etatKanji(lecons, progression(), dejaMontres);
  if (remplacer) {
    const nouveaux = remplacer === 'melanger' ? tirerNouveaux(planifier(ancien, jour, candidats, pool), jour, candidats) : remplacer;
    ancien = remplacerLot(planifier(ancien, jour, candidats, pool), jour, nouveaux);
  }
  const etat = planifier(ancien, jour, candidats, pool);
  ecrire(CLE_WIDGET, etat);
  const js = jours(etat, jour);
  const utiles = new Set(Object.values(js).flatMap(x => [...x.nouveaux, x.rappel]).filter(Boolean));
  const donnees = { v: 1, maj: maintenant.getTime(), niveau, jours: js, fiches: Object.fromEntries([...utiles].map(k => [k, fiches[k]])) };
  try { android()?.setWidgetKanji(JSON.stringify(donnees)); } catch { /* ancienne version de l'appli */ }
  const lot = lotDuJour(etat.lots, jour);
  const fin = lot ? new Date(`${lot.debut}T12:00:00`) : null;
  if (fin) fin.setDate(fin.getDate() + 2);
  return { jour, fiches, niveau, duNiveau, appris, aujourdhui: js[jour], fin: fin ? fin.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '' };
}

let lignes = [];
async function chargerLignes() {
  const cours = await Promise.all(APPLIS.filter(a => a.id !== 'exo').map(a => chargerCours(`../${a.dossier}/`).then(l => [a, l]).catch(() => [a, null])));
  lignes = cours.map(([a, l]) => ({ appli: a, lecons: l, etat: l ? etatLigne(l, lire(a.cle, {})) : null }));
  lignes.push({ appli: APPLIS[3], etat: null });
  return lignes;
}

let kanji = null;
let dernier = null;
const choisis = new Set();

function afficher() {
  const app = document.getElementById('app');
  if (location.hash === '#/choisir') app.innerHTML = vueChoix(dernier);
  else app.innerHTML = dernier ? vue({ ...dernier, lignes }) : vue({ jour: jourDe(), lignes, erreur: erreurChargement });
}

let erreurChargement = '';
async function main() {
  afficher();
  try {
    await chargerLignes();
    kanji = lignes.find(x => x.appli.id === 'kanji')?.lecons;
    if (!kanji) throw new Error('contenu Kanji introuvable');
    // Bouton « mélanger » du widget : l'appli s'ouvre sur #/melanger, on mélange puis on revient à l'accueil.
    const viaWidget = location.hash === '#/melanger';
    dernier = mettreAJour(kanji, new Date(), viaWidget ? 'melanger' : null);
    if (viaWidget) history.replaceState(null, '', '#/');
  } catch (e) {
    erreurChargement = `Impossible de lire les kanji (${e.message}). Hors ligne ?`;
  }
  afficher();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled || !kanji) return;
  const act = el.dataset.act;
  if (act === 'melanger') { dernier = mettreAJour(kanji, new Date(), 'melanger'); afficher(); }
  if (act === 'cocher') {
    const k = el.dataset.k;
    if (choisis.has(k)) choisis.delete(k); else if (choisis.size < 3) choisis.add(k);
    const y = window.scrollY; afficher(); window.scrollTo(0, y);
  }
  if (act === 'valider-choix' && choisis.size === 3) { dernier = mettreAJour(kanji, new Date(), [...choisis]); choisis.clear(); location.hash = '#/'; }
});

window.addEventListener('hashchange', () => {
  // Bouton « mélanger » du widget alors que l'accueil est déjà ouvert.
  if (location.hash === '#/melanger') {
    if (kanji) dernier = mettreAJour(kanji, new Date(), 'melanger');
    history.replaceState(null, '', '#/');
  }
  if (location.hash === '#/choisir') { choisis.clear(); (dernier?.aujourdhui?.nouveaux || []).forEach(k => choisis.add(k)); }
  afficher();
  window.scrollTo(0, 0);
});

// Quand on revient sur l'accueil (retour arrière depuis une appli), on recalcule : une leçon a pu être faite.
window.addEventListener('pageshow', e => { if (e.persisted) main(); });
if (location.hash === '#/choisir') location.hash = '#/';
main();
