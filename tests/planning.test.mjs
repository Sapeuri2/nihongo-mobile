import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ajouterJours, jourDe, jours, planifier, HORIZON } from '../js/planning.js';

const candidats = [...'教習勉強試験文字読書写真'];
const pool = [...'日本人山川'].map(k => ({ k, poids: 1 }));

test('jour du widget : il change à 6 h du matin', () => {
  assert.equal(jourDe(new Date(2026, 10, 21, 5, 59)), '2026-11-20');
  assert.equal(jourDe(new Date(2026, 10, 21, 6, 0)), '2026-11-21');
  assert.equal(ajouterJours('2026-12-31', 1), '2027-01-01');
});

test('3 nouveaux qui restent 2 jours, puis 3 autres ; 1 rappel par jour, jamais un nouveau du jour', () => {
  const e = planifier(null, '2026-11-21', candidats, pool);
  const j = jours(e, '2026-11-21');
  assert.deepEqual(j['2026-11-21'].nouveaux, [...'教習勉']);
  assert.deepEqual(j['2026-11-22'].nouveaux, [...'教習勉'], 'le même lot le 2e jour');
  assert.deepEqual(j['2026-11-23'].nouveaux, [...'強試験'], 'nouveau lot le 3e jour');
  for (const [jour, x] of Object.entries(j)) {
    if (!x.rappel) continue;
    assert.ok(!x.nouveaux.includes(x.rappel), `${jour} : le rappel n'est pas un nouveau du jour`);
  }
  assert.ok(j['2026-11-21'].rappel && j['2026-11-22'].rappel && j['2026-11-21'].rappel !== j['2026-11-22'].rappel, 'un rappel différent chaque jour');
  assert.equal(Object.keys(j).length, HORIZON + 1, 'planifié un mois d\'avance');
});

test('les jours déjà affichés ne changent pas quand on rouvre l\'appli', () => {
  const e1 = planifier(null, '2026-11-21', candidats, pool);
  const j1 = jours(e1, '2026-11-21');
  // Le lendemain : il a appris la leçon de 教 entre-temps, et d'autres kanji ratés comptent plus.
  const e2 = planifier(e1, '2026-11-22', candidats.filter(k => k !== '教'), pool.map(p => ({ ...p, poids: p.k === '山' ? 9 : 1 })));
  const j2 = jours(e2, '2026-11-22');
  assert.deepEqual(j2['2026-11-22'].nouveaux, j1['2026-11-22'].nouveaux, 'le lot en cours reste jusqu\'au bout');
  assert.equal(j2['2026-11-22'].rappel, j1['2026-11-22'].rappel, 'le rappel du jour reste');
  assert.equal(e2.rappels['2026-11-21'], e1.rappels['2026-11-21'], 'l\'historique reste');
});

test('un lot part au bout de 2 jours même pas maîtrisé ; les kanji déjà montrés ne reviennent pas en nouveaux', () => {
  const e1 = planifier(null, '2026-11-21', candidats, pool);
  // Il n'ouvre l'appli que 5 jours plus tard, sans avoir appris aucun de ces kanji.
  const e2 = planifier(e1, '2026-11-26', candidats, pool);
  const j = jours(e2, '2026-11-26');
  const montres = new Set(e2.lots.filter(l => l.debut < '2026-11-25').flatMap(l => l.kanji));
  assert.ok(j['2026-11-26'].nouveaux.length === 3 && j['2026-11-26'].nouveaux.every(k => !montres.has(k) || e2.lots.find(l => l.debut === '2026-11-25')?.kanji.includes(k)));
  assert.deepEqual(e2.lots.find(l => l.debut === '2026-11-21').kanji, [...'教習勉'], 'les lots passés sont gardés tels quels');
  assert.equal(new Set(e2.lots.flatMap(l => l.kanji)).size, e2.lots.flatMap(l => l.kanji).length, 'aucun kanji deux fois en nouveau');
});

test('plus de nouveaux kanji : seulement des rappels ; pas de kanji vus : seulement des nouveaux', () => {
  const j = jours(planifier(null, '2026-11-21', [], pool), '2026-11-21');
  assert.deepEqual(j['2026-11-21'].nouveaux, []);
  assert.ok(j['2026-11-21'].rappel);
  const j2 = jours(planifier(null, '2026-11-21', candidats, []), '2026-11-21');
  assert.equal(j2['2026-11-21'].rappel, null);
});
