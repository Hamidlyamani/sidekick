/**
 * Mock du profil mémorisé pour un contact WhatsApp.
 * C'est une donnée d'exemple à conserver dans GitHub : aucune vraie donnée personnelle.
 */
export const profileMockup = Object.freeze({
  whatsapp_id: "212600000000@c.us",
  nom: "Utilisateur démo",
  date_creation: "2026-09-12T10:00:00.000Z",
  profil: {
    id: "profile-demo-001",
    track: "academique",
    interets: ["informatique", "intelligence artificielle", "data"],
    ville: "Casablanca",
    cv_summary: null,
  },
  recommandations: {
    filieres: ["Développement digital", "Informatique"],
    formations: ["Python débutant"],
    offres: [],
    evenements: [],
  },
});
