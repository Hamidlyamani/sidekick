import { botConfig } from "./bot-config.js";
import { getContexte, updateProfil } from "./api-client.js";
import { extraireProfil, getOpenAiReply } from "./openai-agent.js";

/**
 * Orchestration d'un message.
 *
 * Chaîne : contexte (API) -> réponse (OpenAI) -> extraction de profil (API).
 *
 * L'extraction passe APRÈS la réponse, volontairement : l'utilisateur ne doit
 * pas attendre un second appel LLM avant de voir arriver son message.
 */
export async function answerMessage({ text, whatsappId, nom = null }) {
  const contexte = await getContexte(whatsappId, nom);

  // contexte === null : l'API est tombée. On répond quand même, en mode
  // dégradé — sans catalogue, sans historique. Le prompt le dit au modèle,
  // qui refusera d'inventer des filières plutôt que de meubler.
  const degrade = contexte === null;

  const reponse = await getOpenAiReply({ text, contexte, useWebSearch: true });

  if (!reponse) {
    return {
      text: botConfig.welcomeMessage,
      degrade,
      contexte,
      profilMaj: null,
    };
  }

  // Après coup : enrichissement du profil, sans bloquer l'utilisateur.
  let profilMaj = null;
  if (!degrade) {
    const champs = await extraireProfil({ text, contexte });
    if (Object.keys(champs).length) {
      profilMaj = await updateProfil(whatsappId, champs);
    }
  }

  return { text: reponse, degrade, contexte, profilMaj };
}
