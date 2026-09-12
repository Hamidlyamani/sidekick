import "dotenv/config";
import qrcode from "qrcode-terminal";
import whatsapp from "whatsapp-web.js";
import { answerMessage } from "./agent.js";
import { apiDisponible, getDerniereErreur, saveMessage } from "./api-client.js";

const { Client, LocalAuth } = whatsapp;

// ─────────────────────────────────────────────────────────────────────────
// LISTE BLANCHE — garde-fou obligatoire.
//
// Ce bot tourne SUR TON COMPTE WhatsApp. Sans ce filtre, il répond
// automatiquement à toute personne qui t'écrit : famille, clients, inconnus.
// Ils reçoivent une réponse d'IA en ton nom, sans le savoir.
//
// Le bot REFUSE DE DÉMARRER si la liste est vide. C'est volontaire : sur un
// compte personnel, le défaut sûr est de ne parler à personne.
//
// Dans .env :  WHATSAPP_ALLOWLIST=212600000000,212611111111
// (numéros au format international, sans +, séparés par des virgules)
// ─────────────────────────────────────────────────────────────────────────

const ALLOWLIST = (process.env.WHATSAPP_ALLOWLIST ?? "")
  .split(",")
  .map((n) => n.trim().replace(/[^0-9]/g, ""))
  .filter(Boolean);

if (ALLOWLIST.length === 0) {
  console.error(`
╔══════════════════════════════════════════════════════════════════════╗
║  DÉMARRAGE REFUSÉ : aucune liste blanche configurée.                 ║
╠══════════════════════════════════════════════════════════════════════╣
║  Ce bot répondrait à TOUS tes contacts en ton nom.                   ║
║                                                                      ║
║  Ajoute dans apps/whatsapp/.env les numéros autorisés à lui parler   ║
║  (format international, sans +, séparés par des virgules) :          ║
║                                                                      ║
║      WHATSAPP_ALLOWLIST=212600000000,212611111111                    ║
║                                                                      ║
║  Mets-y le numéro de test depuis lequel tu vas faire la démo.        ║
╚══════════════════════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

/** `212600000000@c.us` -> `212600000000` */
const numeroDe = (whatsappId) => String(whatsappId).split("@")[0].replace(/[^0-9]/g, "");

const estAutorise = (whatsappId) => ALLOWLIST.includes(numeroDe(whatsappId));

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "orientation-agent" }),
  puppeteer: { headless: false },
});

if (!process.env.OPENAI_API_KEY) {
  console.warn("ℹ️  OPENAI_API_KEY absente : le mode IA reste désactivé. Consulte .env.example.");
}

console.log(`🔒 Liste blanche active — ${ALLOWLIST.length} numéro(s) autorisé(s) : ${ALLOWLIST.join(", ")}`);
console.log("   Tout autre contact est ignoré en silence (aucune réponse envoyée).");

if (await apiDisponible()) {
  console.log("✅ API Oriente joignable.");
} else {
  console.warn(
    `⚠️  API Oriente injoignable (${getDerniereErreur() ?? "raison inconnue"}).\n` +
      "   Le bot démarre en mode dégradé : pas de profil, pas d'historique, pas de catalogue.\n" +
      "   Lance-la avec :  cd apps/api && uvicorn app.main:app",
  );
}

client.on("qr", (qr) => {
  console.log("Scanne ce QR code : WhatsApp > Appareils connectés > Connecter un appareil.");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => console.log("✅ Agent WhatsApp connecté et prêt."));
client.on("auth_failure", (message) => console.error("Échec d'authentification WhatsApp :", message));
client.on("disconnected", (reason) => console.warn("WhatsApp déconnecté :", reason));

client.on("message", async (message) => {
  // Jamais les groupes, jamais tes propres messages.
  if (message.fromMe || message.from.endsWith("@g.us")) return;

  // Jamais un numéro hors liste blanche. Silence total : pas de réponse,
  // pas d'accusé de lecture, rien qui trahisse un bot.
  if (!estAutorise(message.from)) {
    console.log(`⛔ Ignoré (hors liste blanche) : ${numeroDe(message.from)}`);
    return;
  }

  try {
    const incomingText = message.body;

    if (!incomingText?.trim()) {
      await message.reply("Envoie-moi ta demande sous forme de texte.");
      return;
    }

    const whatsappId = message.from;
    const waMessageId = message.id?._serialized ?? null;

    // 1. Persister d'abord : un message relivré après reconnexion ne doit pas
    //    déclencher une seconde réponse.
    const ack = await saveMessage(whatsappId, {
      role: "user",
      contenu: incomingText,
      waMessageId,
    });

    if (ack.duplicate) {
      console.log("Message déjà traité, ignoré :", waMessageId);
      return;
    }

    // 2. Contexte + réponse.
    let nom = null;
    try {
      const contact = await message.getContact();
      nom = contact?.pushname ?? null;
    } catch {
      // Le nom est un confort, jamais un bloquant.
    }

    const resultat = await answerMessage({ text: incomingText, whatsappId, nom });

    // 3. Persister la réponse pour que le tour suivant ait le fil complet.
    await saveMessage(whatsappId, { role: "assistant", contenu: resultat.text });

    await message.reply(resultat.text);

    if (resultat.degrade) {
      console.warn("Réponse produite en mode dégradé (API injoignable).");
    }
    if (resultat.profilMaj) {
      console.log("Profil enrichi :", {
        ville: resultat.profilMaj.ville,
        niveau: resultat.profilMaj.niveau,
        track: resultat.profilMaj.track,
        interets: resultat.profilMaj.interets,
      });
    }
  } catch (error) {
    console.error("Impossible de traiter le message :", error);
    await message.reply("Désolé, une erreur est survenue. Réessaie dans un instant.");
  }
});

try {
  await client.initialize();
} catch (error) {
  console.error("Impossible de démarrer WhatsApp :", error);
  process.exitCode = 1;
}
