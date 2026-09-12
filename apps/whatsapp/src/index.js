import "dotenv/config";
import qrcode from "qrcode-terminal";
import whatsapp from "whatsapp-web.js";
import { answerMessage } from "./agent.js";
import { apiDisponible, getDerniereErreur, saveMessage } from "./api-client.js";

const { Client, LocalAuth } = whatsapp;

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "orientation-agent" }),
  puppeteer: { headless: false },
});

if (!process.env.OPENAI_API_KEY) {
  console.warn("ℹ️  OPENAI_API_KEY absente : le mode IA reste désactivé. Consulte .env.example.");
}

// Vérification au démarrage, pas au premier message : mieux vaut découvrir que
// l'API est éteinte maintenant que devant le jury.
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
  if (message.fromMe || message.from.endsWith("@g.us")) return;

  try {
    const incomingText = message.body;

    if (!incomingText?.trim()) {
      await message.reply("Envoie-moi ta demande sous forme de texte.");
      return;
    }

    const whatsappId = message.from;
    const waMessageId = message.id?._serialized ?? null;

    // 1. Persister d'abord. Si ce message a déjà été traité (relivraison après
    //    une reconnexion de whatsapp-web.js), on s'arrête ici sans répondre.
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
