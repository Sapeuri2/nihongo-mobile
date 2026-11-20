// Ce que l'accueil lit de l'appli Kanji (même adresse sapeuri2.github.io) : son contenu (data/) et la progression
// enregistrée sur cet appareil (nk-state-v1). LECTURE SEULE : on n'écrit jamais dans les clés de l'appli Kanji.

export const CLE_KANJI = 'nk-state-v1';
const plain = s => String(s ?? '').replace(/\{([^|{}]+)\|([^{}]+)\}/g, '$1').replace(/\*\*|==/g, '').trim();
const lecture = s => String(s ?? '').replace(/\{([^|{}]+)\|([^{}]+)\}/g, '$2').replace(/\*\*|==/g, '').trim();

// Fiche d'un kanji depuis une section « 教 · enseigner » (avec « **On** : … **Kun** : … » et un tableau vocab).
export function ficheDeSection(s, lecon) {
  const m = String(s?.h || '').match(/^([㐀-鿿]) · (.+)$/);
  if (!m) return null;
  const p0 = plain((s.p || [])[0] || '');
  const on = (p0.match(/On ?: ?([^　\s]+(?:[、,・][^　\s]+)*)/) || [])[1] || '';
  const kun = (p0.match(/Kun ?: ?(.+)$/) || [])[1]?.trim() || '';
  const v = (s.vocab || []).find(x => plain(x.jp).includes(m[1])) || (s.vocab || [])[0];
  return {
    k: m[1], sens: plain(m[2]), on: on === '—' ? '' : on, kun: kun === '—' ? '' : kun, lecon,
    mot: v ? { jp: plain(v.jp), kana: lecture(v.jp), fr: plain(v.fr) } : null,
  };
}

// Leçons d'une appli de cours (même adresse) : id, niveau, titre, numéro ; fiches des kanji pour l'appli Kanji.
export async function chargerCours(base) {
  const json = async u => { const r = await fetch(new URL(u, new URL(base, location.href)), { cache: 'no-cache' }); if (!r.ok) throw new Error(`${u} : ${r.status}`); return r.json(); };
  const man = await json('data/manifest.json');
  const blocs = await Promise.all(man.blocks.map(f => json(f)));
  const lecons = [];
  let num = 0;
  for (const b of blocs) for (const l of b.lessons) lecons.push({ id: l.id, num: ++num, niveau: b.level || '', titre: plain(l.title), fiches: (l.sections || []).map(s => ficheDeSection(s, l.id)).filter(Boolean) });
  return lecons;
}

export const chargerKanji = (base = '../nihongo-kanji/') => chargerCours(base);

export function progression(cle = CLE_KANJI) {
  try { return JSON.parse(localStorage.getItem(cle)) || {}; } catch { return {}; }
}

// À partir du cours et de la progression : kanji à apprendre (ordre du cours, niveau en cours d'abord), kanji déjà
// appris avec leur poids pour les rappels, et la fiche de chaque kanji.
export function etatKanji(lecons, prog, dejaMontres = []) {
  const faite = l => !!prog.lessons?.[l.id]?.done;
  const fiches = {};
  for (const l of lecons) for (const f of l.fiches) fiches[f.k] ||= f;
  const appris = new Set(lecons.filter(faite).flatMap(l => l.fiches.map(f => f.k)));
  // Niveau en cours : celui ouvert en avance s'il y en a un, sinon celui de la première leçon pas faite.
  const ouverts = lecons.filter(l => prog.niveaux?.[l.niveau]?.on).map(l => l.niveau);
  const premiere = lecons.find(l => !faite(l));
  const niveau = ouverts.at(-1) || premiere?.niveau || lecons.at(-1)?.niveau || '';
  const ordreNiveaux = [...new Set(lecons.map(l => l.niveau))];
  const depuis = Math.max(0, ordreNiveaux.indexOf(niveau));
  const candidats = [];
  for (const l of lecons) {
    if (faite(l) || ordreNiveaux.indexOf(l.niveau) < depuis) continue;
    for (const f of l.fiches) if (!appris.has(f.k) && !candidats.includes(f.k)) candidats.push(f.k);
  }
  // Poids d'un kanji appris : plus il est raté dans l'appli Kanji, plus il revient en rappel.
  const poids = {};
  for (const [id, r] of Object.entries(prog.items || {})) {
    const k = id.split('-')[2] || '';
    for (const c of k) if (appris.has(c)) poids[c] = (poids[c] || 1) + (r?.box === 0 ? 3 : 0) + Math.min(r?.ko || 0, 3);
  }
  const pool = [...appris].map(k => ({ k, poids: poids[k] || 1 }));
  for (const k of dejaMontres) if (fiches[k] && !appris.has(k)) pool.push({ k, poids: 2 });
  // Tous les kanji du niveau en cours (appris ou non), dans l'ordre du cours : pour choisir soi-même ceux du widget.
  const duNiveau = [];
  for (const l of lecons) if (l.niveau === niveau) for (const f of l.fiches) if (!duNiveau.includes(f.k)) duNiveau.push(f.k);
  return { niveau, candidats, pool, fiches, duNiveau, appris };
}
