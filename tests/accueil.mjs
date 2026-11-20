// Test navigateur de l'accueil (format téléphone) : contenu Kanji réel, progression simulée, faux pont Android.
//   node tests/accueil.mjs        (dépôt kanji : $DEPOTS/nihongo-kanji, par défaut à côté de ce dépôt)
import { createRequire } from 'node:module';
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium, devices } = createRequire(import.meta.url)('playwright');
const ICI = fileURLToPath(new URL('../', import.meta.url));
const DEPOTS = process.env.DEPOTS || join(ICI, '..');
const racine = mkdtempSync(join(tmpdir(), 'mobile-'));
cpSync(ICI, join(racine, 'nihongo-mobile'), { recursive: true, filter: s => !s.includes('/.git') && !s.includes('/android') });
for (const a of ['kanji', 'grammaire', 'vocabulaire']) cpSync(join(DEPOTS, `nihongo-${a}`, 'data'), join(racine, `nihongo-${a}`, 'data'), { recursive: true });

// Progression : tout le N5 et les deux premières leçons du N4 faites ; 山 raté.
const read = p => JSON.parse(readFileSync(join(racine, 'nihongo-kanji', p), 'utf8'));
const man = read('data/manifest.json');
const blocs = man.blocks.map(read);
const prog = { v: 1, resetAt: 0, lessons: {}, tests: {}, items: { 'k5-04-山-sens': { box: 0, ko: 3, due: 0, t: 1 } }, settings: { t: 1 }, stats: {} };
const lecons = blocs.flatMap(b => b.lessons.map(l => ({ ...l, niveau: b.level })));
for (const l of lecons.filter(l => l.niveau === 'N5')) prog.lessons[l.id] = { done: true, t: 1 };
prog.lessons['k4-01'] = { done: true, t: 1 };
prog.lessons['k4-02'] = { done: true, t: 5000 }; // la plus récente : c'est le Kanji qu'on continue
const gram = { lessons: { 'n5-01': { done: true, t: 100 } }, items: { a: { due: 0, t: 100 }, b: { due: 0, t: 100 } } };
const suivante = lecons.find(l => l.id === 'k4-03');
const attendus = suivante.sections.map(s => (s.h || '').match(/^([㐀-鿿]) · /)?.[1]).filter(Boolean).slice(0, 3);

const PORT = 8961;
const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: racine, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const browser = await chromium.launch();
const echecs = [];
const ok = (c, m) => { if (!c) echecs.push(m); };
const errs = [];
try {
  for (const largeur of [412, 360]) {
    const ctx = await browser.newContext({ ...devices['Pixel 7'], viewport: { width: largeur, height: 800 }, serviceWorkers: 'block' });
    await ctx.addInitScript(([p, g]) => {
      localStorage.setItem('nk-state-v1', JSON.stringify(p));
      localStorage.setItem('ng-state-v1', JSON.stringify(g));
      window.__widget = [];
      window.NihongoAndroid = { setWidgetKanji: j => window.__widget.push(JSON.parse(j)) };
    }, [prog, gram]);
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(`http://localhost:${PORT}/nihongo-mobile/`);
    await p.waitForSelector('.kanjis .kj');
    const k = await p.$$eval('.kanjis .kj .c', els => els.map(e => e.textContent));
    ok(k.length === 4, `4 kanji affichés (${k.join('')})`);
    ok(k.slice(0, 3).join('') === attendus.join(''), `nouveaux = prochains kanji pas appris (${k.slice(0, 3).join('')} ≠ ${attendus.join('')})`);
    ok(await p.$('.kj.rappel'), 'le 4e est un rappel');
    const w = await p.evaluate(() => window.__widget);
    ok(w.length === 1 && Object.keys(w[0].jours).length === 31, 'planning d\'un mois envoyé au widget');
    ok(Object.values(w[0].jours).every(j => j.nouveaux.every(x => w[0].fiches[x]) && (!j.rappel || w[0].fiches[j.rappel])), 'chaque kanji du planning a sa fiche');
    const f = w[0].fiches[attendus[0]];
    ok(f.on || f.kun, 'fiche avec lecture');
    ok(f.lecon === 'k4-03' && f.sens, 'fiche avec sens et leçon');
    ok(await p.getAttribute('.kj', 'href') === `http://localhost:${PORT}/nihongo-kanji/#/lecon/k4-03`, 'toucher un kanji ouvre sa leçon');
    ok((await p.$$('.lignes .ligne')).length === 3, 'les 3 autres lignes sous le billet');
    const billet = (await p.textContent('.billet')).replace(/\s+/g, ' ');
    ok(/de ?K 32.*vers ?K 33/.test(billet) && billet.includes('Composter'), `billet du jour : de K 32 vers K 33 (${billet.slice(0, 80)})`);
    ok(await p.getAttribute('.billet .btn', 'href') === `http://localhost:${PORT}/nihongo-kanji/#/lecon/k4-03`, 'composter ouvre la prochaine leçon');
    ok((await p.textContent('.ligne.grammaire')).includes('2 à revoir'), 'grammaire : révisions dues comptées');
    // Rouvrir le même jour : même planning.
    await p.reload();
    await p.waitForSelector('.kanjis .kj');
    const k2 = await p.$$eval('.kanjis .kj .c', els => els.map(e => e.textContent));
    ok(k2.join('') === k.join(''), 'même kanji à la réouverture');
    const d = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(d <= 0, `débordement de ${d}px à ${largeur}px`);
    if (process.env.CAPTURES) await p.screenshot({ path: join(process.env.CAPTURES, `accueil-${largeur}.png`), fullPage: true });
    await ctx.close();
  }
} catch (e) {
  echecs.push(`SCÉNARIO : ${e.message.split('\n')[0]}`);
}
await browser.close();
server.kill();
rmSync(racine, { recursive: true, force: true });
if (errs.length) echecs.push(`erreurs JS : ${errs.join(' | ')}`);
console.log(`accueil : ${echecs.length ? `✗ ${echecs.length} problème(s)\n  - ${echecs.join('\n  - ')}` : '✓ tout est bon'}`);
process.exit(echecs.length ? 1 : 0);
