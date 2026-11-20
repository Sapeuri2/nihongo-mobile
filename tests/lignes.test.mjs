import { test } from 'node:test';
import assert from 'node:assert/strict';
import { etatLigne, ligneAContinuer } from '../js/lignes.js';

const L = [1, 2, 3, 4].map(n => ({ id: `l${n}`, num: n, niveau: n <= 2 ? 'N5' : 'N4', titre: `L${n}` }));

test('ligne : prochaine leçon, leçon d\'avant, révisions dues, dernière activité', () => {
  const e = etatLigne(L, { lessons: { l1: { done: true, t: 5 } }, items: { a: { due: 1, t: 9 }, b: { due: 1e15, t: 2 } } }, 100);
  assert.deepEqual([e.prochaine.id, e.avant.id, e.dues, e.derniere, e.faites, e.total], ['l2', 'l1', 1, 9, 1, 4]);
});

test('ligne : niveau ouvert en avance → on continue dans ce niveau', () => {
  const e = etatLigne(L, { lessons: { l1: { done: true } }, niveaux: { N4: { on: true } } });
  assert.equal(e.prochaine.id, 'l3');
  assert.equal(e.avant.id, 'l1');
});

test('ligne à continuer : la plus récemment utilisée qui a encore une leçon', () => {
  const c = ligneAContinuer([{ n: 'a', etat: { prochaine: 1, derniere: 3 } }, { n: 'b', etat: { prochaine: 1, derniere: 8 } }, { n: 'c', etat: { prochaine: null, derniere: 99 } }, { n: 'x', etat: null }]);
  assert.equal(c.n, 'b');
});
