export const resources = {
  utilisateurs: {
    key: "whatsapp_id",
    endpoint: "/utilisateurs",
    label: "Utilisateurs",
    singular: "un utilisateur",
    columns: [
      { key: "whatsapp_id", label: "WhatsApp" },
      { key: "nom", label: "Nom" },
      {
        key: "date_creation",
        label: "Inscrit le",
        render: (v) => (v ? new Date(v).toLocaleDateString("fr-FR") : "—"),
      },
    ],
    fields: [
      { name: "whatsapp_id", label: "Numéro WhatsApp", type: "text", required: true },
      { name: "nom", label: "Nom", type: "text", required: true },
    ],
  },

  filieres: {
    key: "id",
    endpoint: "/filieres",
    label: "Filières",
    singular: "une filière",
    columns: [
      { key: "nom", label: "Nom" },
      { key: "universite", label: "Université" },
    ],
    fields: [
      { name: "nom", label: "Nom de la filière", type: "text", required: true },
      { name: "universite", label: "Université", type: "text" },
    ],
  },

  offres: {
    key: "id",
    endpoint: "/offres",
    label: "Offres",
    singular: "une offre",
    columns: [
      { key: "titre", label: "Titre" },
      { key: "entreprise", label: "Entreprise" },
    ],
    fields: [
      { name: "titre", label: "Titre du poste", type: "text", required: true },
      { name: "entreprise", label: "Entreprise", type: "text" },
    ],
  },

  formations: {
    key: "id",
    endpoint: "/formations",
    label: "Formations",
    singular: "une formation",
    columns: [
      { key: "nom", label: "Nom" },
      { key: "competence_ciblee", label: "Compétence ciblée" },
    ],
    fields: [
      { name: "nom", label: "Nom de la formation", type: "text", required: true },
      { name: "competence_ciblee", label: "Compétence ciblée", type: "text" },
    ],
  },

  debouches: {
    key: "id",
    endpoint: "/debouches",
    label: "Débouchés",
    singular: "un débouché",
    columns: [
      { key: "metier", label: "Métier" },
      { key: "salaire_estime", label: "Salaire estimé" },
    ],
    fields: [
      { name: "filiere_id", label: "Filière", type: "select", optionsResource: "filieres", required: true },
      { name: "metier", label: "Métier", type: "text", required: true },
      { name: "salaire_estime", label: "Salaire estimé", type: "text" },
    ],
  },

  rapports: {
    key: "id",
    endpoint: "/rapports",
    label: "Rapports",
    singular: "un rapport",
    columns: [
      { key: "track", label: "Track" },
      { key: "pdf_path", label: "Fichier PDF" },
    ],
    fields: [
      {
        name: "profil_id",
        label: "Profil",
        type: "select",
        optionsResource: "profils",
        optionLabel: (p) => `${p.track || "Profil"} — ${p.whatsapp_id}`,
        required: true,
      },
      { name: "track", label: "Track", type: "text" },
      { name: "pdf_path", label: "Chemin du PDF", type: "text" },
    ],
  },

  event_reminders: {
    key: "id",
    endpoint: "/event-reminders",
    label: "Rappels",
    singular: "un rappel",
    columns: [
      { key: "type", label: "Type" },
      { key: "date_rappel", label: "Date" },
    ],
    fields: [
      {
        name: "offre_id",
        label: "Offre liée",
        type: "select",
        optionsResource: "offres",
        optionLabel: (o) => `${o.titre} — ${o.entreprise || ""}`,
        required: true,
      },
      { name: "type", label: "Type de rappel", type: "text" },
      { name: "date_rappel", label: "Date du rappel", type: "date" },
    ],
  },

  profils: {
    key: "id",
    endpoint: "/profils",
    label: "Profils",
    singular: "un profil",
    columns: [
      { key: "whatsapp_id", label: "Utilisateur" },
      { key: "track", label: "Track" },
      { key: "ville", label: "Ville" },
    ],
    fields: [
      {
        name: "whatsapp_id",
        label: "Utilisateur",
        type: "select",
        optionsResource: "utilisateurs",
        optionValue: "whatsapp_id",
        optionLabel: (u) => `${u.nom} (${u.whatsapp_id})`,
        required: true,
      },
      { name: "track", label: "Track / filière visée", type: "text" },
      { name: "ville", label: "Ville", type: "text" },
      { name: "interets", label: "Centres d'intérêt (séparés par une virgule)", type: "tags" },
      { name: "cv_summary", label: "Résumé du CV", type: "textarea" },
    ],
  },
};
