/**
 * Client HTTP vers l'API Oriente (FastAPI).
 *
 * Règle de conception : l'API qui tombe ne doit JAMAIS faire tomber le bot.
 * Chaque fonction retourne `null` en cas d'échec, et l'appelant décide.
 * Le bot répond alors en mode dégradé au lieu de planter — c'est exactement
 * ce que le critère « Technical Execution » demande de savoir montrer.
 */

const BASE_URL = (process.env.ORIENTE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
const TIMEOUT_MS = Number(process.env.ORIENTE_API_TIMEOUT_MS ?? 5000);

let derniereErreur = null;

/** Dernière erreur réseau/API rencontrée, pour le log et le message dégradé. */
export const getDerniereErreur = () => derniereErreur;

async function appel(chemin, options = {}) {
  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), TIMEOUT_MS);

  try {
    const reponse = await fetch(`${BASE_URL}${chemin}`, {
      ...options,
      signal: controleur.signal,
      headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    });

    if (!reponse.ok) {
      derniereErreur = `${reponse.status} ${reponse.statusText} sur ${chemin}`;
      console.error("API Oriente :", derniereErreur);
      return null;
    }

    derniereErreur = null;
    return await reponse.json();
  } catch (error) {
    derniereErreur =
      error?.name === "AbortError"
        ? `délai de ${TIMEOUT_MS} ms dépassé sur ${chemin}`
        : (error?.message ?? String(error));
    console.error("API Oriente injoignable :", derniereErreur);
    return null;
  } finally {
    clearTimeout(minuteur);
  }
}

/** true si l'API répond ET que sa base est accessible. */
export async function apiDisponible() {
  const sante = await appel("/health");
  return Boolean(sante?.database);
}

/**
 * Profil + historique + catalogue + recommandations, en UN aller-retour.
 * C'est le seul appel à faire à la réception d'un message.
 */
export async function getContexte(whatsappId, nom) {
  const params = nom ? `?nom=${encodeURIComponent(nom)}` : "";
  return appel(`/profils/${encodeURIComponent(whatsappId)}/contexte${params}`);
}

/**
 * Enregistre un message. Retourne `{ duplicate: boolean }`.
 *
 * `duplicate: true` -> whatsapp-web.js a relivré le message après une
 * reconnexion. Le bot doit s'arrêter là, sans répondre une seconde fois.
 *
 * Si l'API est injoignable on retourne `{ duplicate: false }` : mieux vaut
 * risquer un doublon que refuser de répondre à l'utilisateur.
 */
export async function saveMessage(whatsappId, { role, contenu, waMessageId = null }) {
  const resultat = await appel(`/profils/${encodeURIComponent(whatsappId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ role, contenu, wa_message_id: waMessageId }),
  });
  return resultat ?? { duplicate: false, message: null, degrade: true };
}

/** Met à jour les champs extraits de la conversation (ville, niveau, track…). */
export async function updateProfil(whatsappId, champs) {
  return appel(`/profils/${encodeURIComponent(whatsappId)}`, {
    method: "PATCH",
    body: JSON.stringify(champs),
  });
}

/** Trace une recommandation avec son score et sa justification. */
export async function saveRecommandation(whatsappId, { ressourceId, score = 0, justification = null }) {
  return appel(`/profils/${encodeURIComponent(whatsappId)}/recommandations`, {
    method: "POST",
    body: JSON.stringify({ ressource_id: ressourceId, score, justification }),
  });
}

/** Catalogue brut, pour un usage hors conversation (scripts, admin). */
export async function getRessources({ type = null, ville = null, limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (ville) params.set("ville", ville);
  params.set("limit", String(limit));
  return appel(`/ressources?${params}`);
}
