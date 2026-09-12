import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";
import { useToast } from "../context/ToastContext";

function RecommendationSection({ title, items, allOptions, optionLabel, onAdd, onRemove }) {
  const [selected, setSelected] = useState("");

  return (
    <div className="rounded-lg border border-line bg-white/50 p-5">
      <h3 className="mb-3 font-display text-lg text-ink">{title}</h3>
      {items.length === 0 ? (
        <p className="mb-3 text-sm text-ink/50">Aucune recommandation pour l'instant.</p>
      ) : (
        <ul className="mb-3 space-y-2">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between text-sm">
              <span className="text-ink/85">{optionLabel(it)}</span>
              <button onClick={() => onRemove(it.id)} className="text-xs text-ink/40 hover:text-danger">
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <select
          className="flex-1 rounded-md border border-line bg-paper px-2 py-1.5 text-sm"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Choisir…</option>
          {allOptions
            .filter((o) => !items.some((it) => it.id === o.id))
            .map((o) => (
              <option key={o.id} value={o.id}>
                {optionLabel(o)}
              </option>
            ))}
        </select>
        <button
          disabled={!selected}
          onClick={() => {
            onAdd(selected);
            setSelected("");
          }}
          className="rounded-md bg-gold px-3 py-1.5 text-sm font-medium text-ink disabled:opacity-40"
        >
          Recommander
        </button>
      </div>
    </div>
  );
}

export default function ProfilDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [profil, setProfil] = useState(null);
  const [utilisateur, setUtilisateur] = useState(null);
  const [filieres, setFilieres] = useState([]);
  const [offres, setOffres] = useState([]);
  const [formations, setFormations] = useState([]);
  const [rapports, setRapports] = useState([]);
  const [allFilieres, setAllFilieres] = useState([]);
  const [allOffres, setAllOffres] = useState([]);
  const [allFormations, setAllFormations] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    try {
      const p = await api.get(`/profils/${id}`);
      setProfil(p);
      const [u, f, o, fo, r, af, ao, afo] = await Promise.all([
        api.get(`/utilisateurs/${p.whatsapp_id}`),
        api.get(`/profils/${id}/filieres`),
        api.get(`/profils/${id}/offres`),
        api.get(`/profils/${id}/formations`),
        api.get(`/rapports/?profil_id=${id}`),
        api.get(`/filieres/`),
        api.get(`/offres/`),
        api.get(`/formations/`),
      ]);
      setUtilisateur(u);
      setFilieres(f);
      setOffres(o);
      setFormations(fo);
      setRapports(r);
      setAllFilieres(af);
      setAllOffres(ao);
      setAllFormations(afo);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function withFeedback(action, successMessage) {
    try {
      await action();
      toast.success(successMessage);
      await loadAll();
    } catch (e) {
      toast.error(e.message);
    }
  }

  if (error) {
    return (
      <div>
        <Link to="/console/profils" className="mb-6 inline-block text-sm text-ink/50 hover:text-ink">
          ← Profils
        </Link>
        <div className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>
      </div>
    );
  }

  if (loading || !profil) {
    return (
      <div>
        <div className="skeleton mb-4 h-4 w-24 rounded bg-ink/10" />
        <div className="skeleton mb-2 h-8 w-64 rounded bg-ink/10" />
        <div className="skeleton h-4 w-40 rounded bg-ink/10" />
      </div>
    );
  }

  return (
    <div>
      <Link to="/console/profils" className="mb-6 inline-block text-sm text-ink/50 hover:text-ink">
        ← Profils
      </Link>
      <h1 className="font-display text-3xl text-ink">{utilisateur?.nom || "Profil"}</h1>
      <p className="mb-8 text-sm text-ink/60">
        {profil.track || "Track non défini"} · {profil.ville || "Ville non renseignée"}
      </p>

      <div className="mb-8 grid grid-cols-2 gap-4 text-sm">
        <div className="rounded-lg border border-line bg-white/50 p-4">
          <p className="text-ink/50">Centres d'intérêt</p>
          <p className="mt-1 text-ink">{profil.interets?.join(", ") || "—"}</p>
        </div>
        <div className="rounded-lg border border-line bg-white/50 p-4">
          <p className="text-ink/50">WhatsApp</p>
          <p className="mt-1 text-ink">{profil.whatsapp_id}</p>
        </div>
      </div>

      {profil.cv_summary && (
        <div className="mb-8 rounded-lg border border-line bg-white/50 p-4 text-sm">
          <p className="mb-1 text-ink/50">Résumé du CV</p>
          <p className="text-ink/85">{profil.cv_summary}</p>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <RecommendationSection
          title="Filières recommandées"
          items={filieres}
          allOptions={allFilieres}
          optionLabel={(f) => f.nom}
          onAdd={(fid) => withFeedback(() => api.post(`/profils/${id}/filieres/${fid}`), "Filière recommandée.")}
          onRemove={(fid) => withFeedback(() => api.del(`/profils/${id}/filieres/${fid}`), "Filière retirée.")}
        />
        <RecommendationSection
          title="Offres recommandées"
          items={offres}
          allOptions={allOffres}
          optionLabel={(o) => `${o.titre} — ${o.entreprise || ""}`}
          onAdd={(oid) => withFeedback(() => api.post(`/profils/${id}/offres/${oid}`), "Offre recommandée.")}
          onRemove={(oid) => withFeedback(() => api.del(`/profils/${id}/offres/${oid}`), "Offre retirée.")}
        />
        <RecommendationSection
          title="Formations recommandées"
          items={formations}
          allOptions={allFormations}
          optionLabel={(f) => f.nom}
          onAdd={(fid) => withFeedback(() => api.post(`/profils/${id}/formations/${fid}`), "Formation recommandée.")}
          onRemove={(fid) => withFeedback(() => api.del(`/profils/${id}/formations/${fid}`), "Formation retirée.")}
        />
        <div className="rounded-lg border border-line bg-white/50 p-5">
          <h3 className="mb-3 font-display text-lg text-ink">Rapports générés</h3>
          {rapports.length === 0 ? (
            <p className="text-sm text-ink/50">Aucun rapport pour l'instant.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {rapports.map((r) => (
                <li key={r.id} className="flex items-center justify-between">
                  <span className="text-ink/85">{r.track || "Rapport"}</span>
                  <span className="text-ink/40">{r.pdf_path}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
