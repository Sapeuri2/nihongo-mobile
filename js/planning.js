// Planning du widget Kanji (fonctions pures, testables dans Node).
// Règle voulue par l'utilisateur : chaque jour 4 kanji = 3 nouveaux qui restent 2 jours + 1 rappel qui reste 1 jour.
// Au bout de leurs 2 jours, les nouveaux partent même s'ils ne sont pas maîtrisés. Le jour change à 6 h du matin.
// Les jours déjà affichés (≤ aujourd'hui) ne changent jamais ; les jours futurs sont recalculés à chaque ouverture.

export const PAR_LOT = 3;
export const DUREE_LOT = 2; // jours
export const HORIZON = 30; // jours planifiés d'avance (le widget marche un mois sans ouvrir l'appli)
export const HEURE_CHANGEMENT = 6;

const DAY = 86400000;

// Jour « widget » d'un instant : avant 6 h, c'est encore la veille. Format AAAA-MM-JJ (heure locale).
export function jourDe(date = new Date()) {
  const d = new Date(date.getTime() - HEURE_CHANGEMENT * 3600000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ajouterJours(jour, n) {
  const [a, m, j] = jour.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1, j) + n * DAY);
  return d.toISOString().slice(0, 10);
}

export const ecart = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);

// Petit hasard déterministe (même graine → même tirage) : le rappel d'un jour futur ne saute pas d'une ouverture à l'autre.
function graine(s) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}

// etat : ce qui a été planifié la dernière fois { lots: [{ debut, kanji: [..] }], rappels: { jour: k } }
// candidats : kanji pas encore appris, dans l'ordre du cours (niveau en cours d'abord)
// pool : kanji déjà vus pour les rappels, avec un poids (plus il est raté, plus il revient) : [{ k, poids }]
// Renvoie le nouvel état (jours passés et du jour gardés tels quels, futur recalculé).
export function planifier(etat, aujourdHui, candidats, pool) {
  const lots = (etat?.lots || []).filter(l => l && l.debut && Array.isArray(l.kanji));
  const figes = lots.filter(l => l.debut <= aujourdHui).sort((a, b) => (a.debut < b.debut ? -1 : 1));
  const dejaVus = new Set(figes.flatMap(l => l.kanji));
  const libres = candidats.filter(k => !dejaVus.has(k));
  const out = [...figes];
  // Prochain lot : après le dernier lot figé (s'il couvre encore aujourd'hui), sinon aujourd'hui.
  const dernier = figes.at(-1);
  let debut = dernier && ecart(dernier.debut, aujourdHui) < DUREE_LOT ? ajouterJours(dernier.debut, DUREE_LOT) : aujourdHui;
  let i = 0;
  while (ecart(aujourdHui, debut) <= HORIZON && i < libres.length) {
    out.push({ debut, kanji: libres.slice(i, i + PAR_LOT) });
    i += PAR_LOT;
    debut = ajouterJours(debut, DUREE_LOT);
  }
  // Rappels : figés jusqu'à aujourd'hui ; ensuite un par jour, tiré parmi les kanji vus (les plus ratés plus souvent),
  // jamais un kanji du lot affiché ce jour-là, et pas deux fois en 5 jours.
  const rappels = Object.fromEntries(Object.entries(etat?.rappels || {}).filter(([j]) => j <= aujourdHui));
  const vus = pool.filter(p => p && p.k);
  for (let n = 0; n <= HORIZON; n++) {
    const jour = ajouterJours(aujourdHui, n);
    if (rappels[jour] || !vus.length) continue;
    const affiches = new Set(lotDuJour(out, jour)?.kanji || []);
    const recents = new Set(Array.from({ length: 5 }, (_, d) => rappels[ajouterJours(jour, -d - 1)]).filter(Boolean));
    let choix = vus.filter(p => !affiches.has(p.k) && !recents.has(p.k));
    if (!choix.length) choix = vus.filter(p => !affiches.has(p.k));
    if (!choix.length) continue;
    const alea = graine(jour);
    const total = choix.reduce((s, p) => s + Math.max(0.1, p.poids || 1), 0);
    let r = alea() * total;
    let pris = choix[choix.length - 1];
    for (const p of choix) { r -= Math.max(0.1, p.poids || 1); if (r <= 0) { pris = p; break; } }
    rappels[jour] = pris.k;
  }
  // On garde l'historique récent seulement (les 60 derniers jours).
  const limite = ajouterJours(aujourdHui, -60);
  return {
    lots: out.filter(l => l.debut >= limite),
    rappels: Object.fromEntries(Object.entries(rappels).filter(([j]) => j >= limite)),
  };
}

export function lotDuJour(lots, jour) {
  return lots.find(l => l.debut <= jour && ecart(l.debut, jour) < DUREE_LOT) || null;
}

// Ce que le widget affiche chaque jour : { jour: { nouveaux: [k, k, k], rappel: k } }, d'aujourd'hui à l'horizon.
export function jours(etat, aujourdHui) {
  const out = {};
  for (let n = 0; n <= HORIZON; n++) {
    const jour = ajouterJours(aujourdHui, n);
    const lot = lotDuJour(etat.lots, jour);
    out[jour] = { nouveaux: lot?.kanji || [], rappel: etat.rappels[jour] || null, debutLot: lot?.debut || null };
  }
  return out;
}
