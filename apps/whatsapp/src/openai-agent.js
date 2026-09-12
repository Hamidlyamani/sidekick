import OpenAI from "openai";
import {
  champsManquants,
  formatCatalogue,
  formatDejaRecommande,
  formatHistorique,
  formatProfil,
} from "./context-builder.js";

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL ?? "gpt-5";
const searchModel = process.env.OPENAI_SEARCH_MODEL ?? "gpt-5.6-luna";
const extractionModel = process.env.OPENAI_EXTRACTION_MODEL ?? model;
const openai = apiKey ? new OpenAI({ apiKey }) : null;

const BASE = `Tu es Orienta, un agent WhatsApp chaleureux qui aide les personnes à construire leur ambition : études, formations, débouchés, offres d'emploi et événements.
Détecte automatiquement la langue du dernier message et réponds dans cette même langue. Ne réponds pas systématiquement en français : « hello » ou « hey » doit recevoir une réponse en anglais, « bonjour » une réponse en français, et un message en arabe une réponse en arabe.
Réponds naturellement et brièvement, comme dans une conversation WhatsApp. L'utilisateur n'a pas besoin de connaître des commandes ni des mots-clés.
Comprends l'intention à partir des phrases normales. Pose au maximum une question utile à la fois.
Ne prétends jamais avoir effectué une inscription, une candidature ou une réservation.
Ne demande jamais de clé API, mot de passe ou information bancaire.`;

/** Ce qui change tout : le catalogue est réel et sourcé, ou il est absent. */
function reglesCatalogue(catalogue) {
  if (!catalogue) {
    return `Tu n'as AUCUN catalogue interne disponible pour ce message (la base de données est injoignable).
N'invente aucune filière, formation, offre ni établissement. Dis simplement que tu ne peux pas consulter le catalogue pour l'instant, et propose de répondre de façon générale.`;
  }
  return `Catalogue interne vérifié — chaque entrée porte son identifiant entre crochets et son URL source :

${catalogue}

Règles sur ce catalogue :
- Quand tu recommandes une entrée du catalogue, cite TOUJOURS son URL source.
- Ne cite jamais une filière, un établissement ou un chiffre qui ne vient pas de ce catalogue ou de la recherche Web.
- Ne mentionne jamais les identifiants entre crochets à l'utilisateur : ils sont pour le système.
- Si le catalogue ne couvre pas la demande, dis-le plutôt que de combler le vide.`;
}

/**
 * Réponse conversationnelle, construite sur le contexte réel de l'API.
 * Retourne `null` si aucune clé OpenAI n'est configurée.
 */
export async function getOpenAiReply({ text, contexte, useWebSearch = true }) {
  if (!openai) return null;

  const profil = contexte?.profil ?? null;
  const catalogue = formatCatalogue(contexte?.ressources ?? []);
  const manquants = champsManquants(profil);
  const dejaVu = formatDejaRecommande(contexte?.recommandations ?? []);

  const instructions = [
    BASE,
    `Profil connu du contact : ${formatProfil(profil)}`,
    manquants.length
      ? `Informations encore manquantes : ${manquants.join(", ")}. Demande-en UNE seule, et seulement si elle est utile pour répondre maintenant.`
      : "Le profil est complet : ne redemande pas ces informations.",
    dejaVu,
    reglesCatalogue(catalogue),
    useWebSearch
      ? "Une recherche Web est disponible. Utilise-la uniquement pour une information actuelle que le catalogue ne contient pas : offre d'emploi récente, événement daté. Donne au maximum trois résultats, chacun avec son lien."
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  // L'historique vient de la base : le bot a enfin une mémoire entre messages.
  const input = [...formatHistorique(contexte?.historique ?? []), { role: "user", content: text }];

  try {
    const response = await openai.responses.create({
      model: useWebSearch ? searchModel : model,
      instructions,
      input,
      reasoning: useWebSearch ? { effort: "none" } : { effort: "minimal" },
      max_output_tokens: useWebSearch ? 800 : 500,
      tools: useWebSearch ? [{ type: "web_search" }] : undefined,
    });

    return response.output_text?.trim() || null;
  } catch (error) {
    console.error("Erreur OpenAI :", error?.message ?? error);
    return "Je rencontre un problème avec le service IA. Réessaie dans un instant.";
  }
}

/**
 * Extrait ville / niveau / track / intérêts du dernier échange.
 *
 * Appelée UNIQUEMENT quand il manque des champs : sur un profil complet, c'est
 * un appel LLM par message pour rien. Retourne `{}` si rien n'est extractible —
 * ne devine pas, et surtout ne renvoie jamais une valeur que l'utilisateur
 * n'a pas dite.
 */
export async function extraireProfil({ text, contexte }) {
  if (!openai) return {};
  if (!champsManquants(contexte?.profil).length) return {};

  try {
    const response = await openai.responses.create({
      model: extractionModel,
      instructions: `Extrais uniquement ce que l'utilisateur a EXPLICITEMENT dit sur lui-même.
Réponds en JSON strict, sans texte autour, avec ces clés optionnelles :
{"ville": string, "niveau": string, "track": "academique"|"professionnel"|"insertion", "interets": string[]}
Omets toute clé dont la valeur n'est pas explicitement présente dans le message. N'infère rien, ne complète rien.
Si rien n'est extractible, réponds {}.`,
      input: text,
      reasoning: { effort: "minimal" },
      max_output_tokens: 200,
    });

    const brut = response.output_text?.trim();
    if (!brut) return {};

    const json = brut.replace(/^```(?:json)?\s*|\s*```$/g, "");
    const extrait = JSON.parse(json);

    // Filet de sécurité : on ne laisse passer que les clés connues.
    const autorisees = ["ville", "niveau", "track", "interets"];
    return Object.fromEntries(
      Object.entries(extrait).filter(
        ([cle, valeur]) => autorisees.includes(cle) && valeur != null && valeur !== "",
      ),
    );
  } catch (error) {
    // Une extraction ratée ne doit jamais casser la réponse à l'utilisateur.
    console.error("Extraction de profil échouée :", error?.message ?? error);
    return {};
  }
}
