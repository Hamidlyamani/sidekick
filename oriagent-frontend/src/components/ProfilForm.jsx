import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useToast } from "../context/ToastContext";

const emptyForm = {
  whatsapp_id: "",
  nom: "",
  track: "",
  ville: "",
  interets: "",
  cv_summary: "",
};

export default function ProfilForm() {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  function update(name, value) {
    setForm((s) => ({ ...s, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // Crée l'utilisateur s'il n'existe pas encore — s'il existe déjà,
      // le backend renvoie 400 et on continue simplement avec son profil.
      try {
        await api.post("/utilisateurs/", { whatsapp_id: form.whatsapp_id, nom: form.nom });
      } catch (err) {
        if (!/existe déjà/i.test(err.message)) throw err;
      }

      const profil = await api.post("/profils/", {
        whatsapp_id: form.whatsapp_id,
        track: form.track || null,
        ville: form.ville || null,
        interets: form.interets
          ? form.interets.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        cv_summary: form.cv_summary || null,
      });

      setForm(emptyForm);
      toast.success("Profil enregistré.");
      navigate(`/console/profils/${profil.id}`);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const input =
    "w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-gold/50";

  return (
    <div className="rounded-lg border border-line bg-white/50 p-6">
      <h2 className="mb-1 font-display text-xl text-ink">Remplir un profil</h2>
      <p className="mb-5 text-sm text-ink/60">
        Renseignez un utilisateur WhatsApp et son profil d'orientation en une seule fois.
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-ink/70">Numéro WhatsApp</label>
          <input
            className={input}
            type="text"
            required
            placeholder="212600000000"
            value={form.whatsapp_id}
            onChange={(e) => update("whatsapp_id", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink/70">Nom</label>
          <input
            className={input}
            type="text"
            required
            placeholder="Nom complet"
            value={form.nom}
            onChange={(e) => update("nom", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink/70">Track / filière visée</label>
          <input className={input} type="text" value={form.track} onChange={(e) => update("track", e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink/70">Ville</label>
          <input className={input} type="text" value={form.ville} onChange={(e) => update("ville", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm text-ink/70">Centres d'intérêt (séparés par une virgule)</label>
          <input
            className={input}
            type="text"
            placeholder="ex : IA, Web, Design"
            value={form.interets}
            onChange={(e) => update("interets", e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm text-ink/70">Résumé du CV</label>
          <textarea className={input} rows={4} value={form.cv_summary} onChange={(e) => update("cv_summary", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Enregistrement…" : "Enregistrer le profil"}
          </button>
        </div>
      </form>
    </div>
  );
}
