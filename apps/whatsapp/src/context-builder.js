/**
 * Transforme le contexte renvoyé par l'API en texte injectable dans le prompt.
 *
 * Séparé de l'agent pour une raison pratique : c'est testable sans clé OpenAI
 * ni réseau, et c'est là que se jouent les hallucinations. Le catalogue passé
 * au modèle porte toujours ses URLs — un modèle à qui on donne des sources
 * invente beaucoup moins qu'un modèle à qui on donne des titres nus.
 */

const LIBELLES = {
  filiere: "Filières",
  formation: "Formations",
  offre: "Offres d'emploi",
  debouche: "Débouchés",
  evenement: "Événements",
};

/** Profil en une ligne lisible, ou l'aveu qu'on ne sait encore rien. */
export function formatProfil(profil) {
  if (!profil) return "Profil inconnu (aucune donnée enregistrée).";

  const morceaux = [];
  if (profil.nom) morceaux.push(`nom : ${profil.nom}`);
  if (profil.ville) morceaux.push(`ville : ${profil.ville}`);
  if (profil.niveau) morceaux.push(`niveau : ${profil.niveau}`);
  if (profil.track && profil.track !== "inconnu") morceaux.push(`parcours : ${profil.track}`);
  if (profil.interets?.length) morceaux.push(`intérêts : ${profil.interets.join(", ")}`);
  if (profil.cv_summary) morceaux.push(`CV : ${profil.cv_summary}`);

  return morceaux.length ? morceaux.join(" | ") : "Profil créé mais encore vide.";
}

/** Champs manquants, pour que l'agent sache quoi demander ensuite. */
export function champsManquants(profil) {
  if (!profil) return ["ville", "niveau", "centre d'intérêt"];
  const manquants = [];
  if (!profil.ville) manquants.push("ville");
  if (!profil.niveau) manquants.push("niveau d'études");
  if (!profil.interets?.length) manquants.push("centre d'intérêt");
  return manquants;
}

/**
 * Catalogue groupé par type, avec les URLs sources.
 * Retourne une chaîne vide si la base ne contient rien — dans ce cas le prompt
 * doit dire explicitement au modèle qu'il n'a pas de catalogue, jamais le
 * laisser combler le vide.
 */
export function formatCatalogue(ressources = []) {
  if (!ressources.length) return "";

  const groupes = new Map();
  for (const r of ressources) {
    if (!groupes.has(r.type)) groupes.set(r.type, []);
    groupes.get(r.type).push(r);
  }

  const sections = [];
  for (const [type, items] of groupes) {
    const lignes = items.map((r) => {
      const parties = [`- [${r.id}] ${r.titre}`];
      if (r.organisation) parties.push(`(${r.organisation})`);
      if (r.ville) parties.push(`— ${r.ville}`);
      if (r.url) parties.push(`\n  source : ${r.url}`);
      return parties.join(" ");
    });
    sections.push(`${LIBELLES[type] ?? type} :\n${lignes.join("\n")}`);
  }

  return sections.join("\n\n");
}

/** Historique au format messages OpenAI, prêt à concaténer. */
export function formatHistorique(historique = []) {
  return historique
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.contenu }));
}

/** Recommandations déjà faites — évite que l'agent répète les mêmes. */
export function formatDejaRecommande(recommandations = []) {
  if (!recommandations.length) return "";
  const titres = recommandations.map((r) => r.ressource?.titre).filter(Boolean);
  return titres.length ? `Déjà recommandé à ce contact : ${titres.join(" ; ")}.` : "";
}
