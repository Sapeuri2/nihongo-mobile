// Où en est l'utilisateur dans chaque appli (« ligne ») : leçon faite d'avant, prochaine leçon, révisions dues,
// dernière activité. Fonctions pures (testables dans Node).

// lecons : [{ id, num, niveau, titre }] dans l'ordre du cours ; prog : progression de l'appli (lue, jamais écrite).
export function etatLigne(lecons, prog, now = Date.now()) {
  const faite = l => !!prog?.lessons?.[l.id]?.done;
  // Niveau ouvert en avance (« Commencer le N4 ») : la prochaine leçon est prise dans ce niveau.
  const ouverts = lecons.filter(l => prog?.niveaux?.[l.niveau]?.on).map(l => l.niveau);
  const niveau = ouverts.at(-1) || null;
  const dans = niveau ? lecons.filter(l => l.niveau === niveau) : lecons;
  const prochaine = dans.find(l => !faite(l)) || null;
  const avant = prochaine ? [...lecons].reverse().find(l => faite(l) && l.num < prochaine.num) || null : [...lecons].reverse().find(faite) || null;
  const items = Object.values(prog?.items || {});
  const dues = items.filter(r => r && r.due <= now).length;
  const temps = [...Object.values(prog?.lessons || {}).map(l => l?.t || 0), ...items.map(r => r?.t || 0)];
  return {
    faites: lecons.filter(faite).length,
    total: lecons.length,
    niveau: (prochaine || avant)?.niveau || '',
    prochaine, avant, dues,
    derniere: Math.max(0, ...temps),
  };
}

// La ligne à « continuer » : celle utilisée le plus récemment qui a encore une leçon à faire.
export function ligneAContinuer(lignes) {
  const possibles = lignes.filter(x => x.etat?.prochaine);
  return possibles.sort((a, b) => b.etat.derniere - a.etat.derniere)[0] || null;
}
