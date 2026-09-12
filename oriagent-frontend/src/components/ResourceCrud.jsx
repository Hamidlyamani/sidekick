import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { resources } from "../config/resources";
import { useToast } from "../context/ToastContext";
import ConfirmDialog from "./ConfirmDialog";

function defaultOptionLabel(item) {
  return item.nom || item.titre || item.metier || item.type || item.track || String(item.id);
}

function tagsToString(value) {
  return Array.isArray(value) ? value.join(", ") : value || "";
}

function FieldInput({ field, value, onChange, optionsCache }) {
  const base =
    "w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-gold/50";

  if (field.type === "select") {
    const opts = optionsCache[field.optionsResource] || [];
    const optionValue = field.optionValue || "id";
    const optionLabel = field.optionLabel || defaultOptionLabel;
    return (
      <select className={base} value={value || ""} onChange={(e) => onChange(e.target.value)} required={field.required}>
        <option value="" disabled>
          Choisir…
        </option>
        {opts.map((o) => (
          <option key={o[optionValue]} value={o[optionValue]}>
            {optionLabel(o)}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "textarea") {
    return <textarea className={base} rows={3} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  }

  if (field.type === "tags") {
    return (
      <input
        className={base}
        type="text"
        placeholder="ex : IA, Web, Design"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <input
      className={base}
      type={field.type === "date" ? "date" : "text"}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      required={field.required}
    />
  );
}

function TableSkeleton({ columns }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-ink/[0.03] text-left text-ink/60">
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-2 font-medium">
                {c.label}
              </th>
            ))}
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 4 }).map((_, row) => (
            <tr key={row} className="border-b border-line last:border-0">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3">
                  <div className="skeleton h-4 w-3/4 rounded bg-ink/10" />
                </td>
              ))}
              <td className="px-4 py-3" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ResourceCrud({ resourceKey, onRowClick }) {
  const config = resources[resourceKey];
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});
  const [optionsCache, setOptionsCache] = useState({});
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`${config.endpoint}/`);
      setItems(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadOptions() {
    const needed = [...new Set(config.fields.filter((f) => f.type === "select").map((f) => f.optionsResource))];
    const results = {};
    for (const res of needed) {
      try {
        results[res] = await api.get(`${resources[res].endpoint}/`);
      } catch {
        results[res] = [];
      }
    }
    setOptionsCache(results);
  }

  useEffect(() => {
    setForm({});
    setShowForm(false);
    setEditingId(null);
    setQuery("");
    load();
    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceKey]);

  function openCreateForm() {
    setEditingId(null);
    setForm({});
    setShowForm(true);
  }

  function openEditForm(item) {
    const prefilled = { ...item };
    config.fields.forEach((f) => {
      if (f.type === "tags") prefilled[f.name] = tagsToString(item[f.name]);
    });
    setForm(prefilled);
    setEditingId(item[config.key]);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({});
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form };
    config.fields.forEach((f) => {
      if (f.type === "tags") {
        payload[f.name] = (form[f.name] || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
    });
    setSubmitting(true);
    try {
      if (editingId !== null) {
        await api.patch(`${config.endpoint}/${editingId}`, payload);
        toast.success(`${config.label.slice(0, -1) || "Élément"} mis à jour.`);
      } else {
        await api.post(`${config.endpoint}/`, payload);
        toast.success(`${config.label.slice(0, -1) || "Élément"} créé.`);
      }
      closeForm();
      load();
    } catch (e) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    const id = pendingDelete;
    setPendingDelete(null);
    if (id === null || id === undefined) return;
    try {
      await api.del(`${config.endpoint}/${id}`);
      toast.success("Supprimé.");
      load();
    } catch (e) {
      setError(e.message);
      toast.error(e.message);
    }
  }

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items.filter((item) =>
      config.columns.some((c) => {
        const raw = item[c.key];
        const text = Array.isArray(raw) ? raw.join(" ") : String(raw ?? "");
        return text.toLowerCase().includes(q);
      })
    );
  }, [items, query, config.columns]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-ink">{config.label}</h1>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              className="w-48 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-gold/50"
            />
          )}
          <button
            onClick={() => (showForm ? closeForm() : openCreateForm())}
            className="rounded-md bg-ink px-4 py-2 text-sm text-paper transition-colors hover:bg-teal"
          >
            {showForm ? "Annuler" : `Ajouter ${config.singular}`}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="shrink-0 text-xs opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 space-y-4 rounded-lg border border-line bg-white/60 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink/40">
            {editingId !== null ? `Modifier ${config.singular}` : `Nouveau : ${config.singular}`}
          </p>
          {config.fields.map((f) => (
            <div key={f.name}>
              <label className="mb-1 block text-sm text-ink/70">{f.label}</label>
              <FieldInput field={f} value={form[f.name]} onChange={(v) => setForm((s) => ({ ...s, [f.name]: v }))} optionsCache={optionsCache} />
            </div>
          ))}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-md px-4 py-2 text-sm text-ink/60 hover:text-ink"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <TableSkeleton columns={config.columns} />
      ) : items.length === 0 ? (
        <p className="text-sm text-ink/50">Rien pour l'instant. Ajoutez {config.singular} pour commencer.</p>
      ) : filteredItems.length === 0 ? (
        <p className="text-sm text-ink/50">Aucun résultat pour « {query} ».</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-ink/[0.03] text-left text-ink/60">
                {config.columns.map((c) => (
                  <th key={c.key} className="px-4 py-2 font-medium">
                    {c.label}
                  </th>
                ))}
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr
                  key={item[config.key]}
                  className={`border-b border-line last:border-0 ${onRowClick ? "cursor-pointer hover:bg-ink/[0.02]" : ""}`}
                  onClick={() => onRowClick && onRowClick(item)}
                >
                  {config.columns.map((c) => (
                    <td key={c.key} className="px-4 py-3 text-ink/85">
                      {c.render
                        ? c.render(item[c.key], item)
                        : Array.isArray(item[c.key])
                        ? item[c.key].join(", ") || "—"
                        : String(item[c.key] ?? "—")}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditForm(item);
                      }}
                      className="mr-3 text-xs text-ink/40 hover:text-teal"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingDelete(item[config.key]);
                      }}
                      className="text-xs text-ink/40 hover:text-danger"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Confirmer la suppression"
        message={`Voulez-vous vraiment supprimer ${config.singular} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
