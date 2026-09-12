import { useEffect, useState } from "react";
import { api } from "../api";
import { resources } from "../config/resources";
import StatCard from "../components/StatCard";
import ProfilForm from "../components/ProfilForm";

const statResources = [
  { key: "utilisateurs", to: "/console/utilisateurs" },
  { key: "profils", to: "/console/profils" },
  { key: "filieres", to: "/console/filieres" },
  { key: "debouches", to: "/console/debouches" },
  { key: "offres", to: "/console/offres" },
  { key: "formations", to: "/console/formations" },
  { key: "rapports", to: "/console/rapports" },
  { key: "event_reminders", to: "/console/rappels" },
];

export default function Dashboard() {
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadCounts() {
      setLoading(true);
      const entries = await Promise.all(
        statResources.map(async ({ key }) => {
          try {
            const data = await api.get(`${resources[key].endpoint}/`);
            return [key, Array.isArray(data) ? data.length : 0];
          } catch {
            return [key, null];
          }
        })
      );
      if (!cancelled) {
        setCounts(Object.fromEntries(entries));
        setLoading(false);
      }
    }
    loadCounts();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl text-ink">Vue d'ensemble</h1>
      <p className="mb-6 text-sm text-ink/60">Aperçu des données qui alimentent les recommandations OriAgent.</p>

      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statResources.map(({ key, to }) => (
          <StatCard
            key={key}
            label={resources[key].label}
            value={counts[key] ?? "—"}
            to={to}
            loading={loading}
          />
        ))}
      </div>

      <ProfilForm />
    </div>
  );
}
