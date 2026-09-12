import { NavLink, Link } from "react-router-dom";

const links = [
  { to: "/console", label: "Vue d'ensemble", end: true },
  { to: "/console/utilisateurs", label: "Utilisateurs" },
  { to: "/console/profils", label: "Profils" },
  { to: "/console/filieres", label: "Filières" },
  { to: "/console/debouches", label: "Débouchés" },
  { to: "/console/offres", label: "Offres" },
  { to: "/console/formations", label: "Formations" },
  { to: "/console/rapports", label: "Rapports" },
  { to: "/console/rappels", label: "Rappels" },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-60 flex-none flex-col justify-between bg-ink px-5 py-8 transition-transform duration-200 md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          <div className="mb-10 flex items-center justify-between">
            <div>
              <span className="font-display text-2xl text-paper">OriAgent</span>
              <p className="mt-1 text-xs text-paper/50">Console d'orientation</p>
            </div>
            <button
              onClick={onClose}
              className="text-paper/60 hover:text-paper md:hidden"
              aria-label="Fermer le menu"
            >
              ✕
            </button>
          </div>
          <nav className="space-y-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive ? "bg-paper/10 text-gold" : "text-paper/70 hover:bg-paper/5 hover:text-paper"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <Link to="/" className="text-xs text-paper/30 hover:text-paper/60">
          ← Retour au site
        </Link>
      </aside>
    </>
  );
}
