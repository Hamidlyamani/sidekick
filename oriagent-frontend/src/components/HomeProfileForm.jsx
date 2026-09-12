import { useState } from "react";
import { api } from "../api";
import { useToast } from "../context/ToastContext";
import { parseResumePdf } from "../utils/parseResume";

const emptyForm = {
  nom: "",
  whatsapp_id: "",
  track: "",
  ville: "",
  interets: "",
  cv_summary: "",
};

export default function HomeProfileForm() {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [resumeFileName, setResumeFileName] = useState("");
  const [note, setNote] = useState(null);
  const toast = useToast();

  function update(name, value) {
    setForm((s) => ({ ...s, [name]: value }));
  }

  async function handleResumeUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setNote({ type: "error", message: "Please upload a PDF file." });
      e.target.value = "";
      return;
    }

    setParsing(true);
    setNote(null);
    setResumeFileName(file.name);
    try {
      const parsed = await parseResumePdf(file);
      setForm((s) => ({
        ...s,
        nom: s.nom || parsed.nom,
        whatsapp_id: s.whatsapp_id || parsed.phone,
        interets: s.interets || parsed.interets.join(", "),
        cv_summary: parsed.cv_summary || s.cv_summary,
      }));
      setNote({
        type: "success",
        message: "Résumé read — check the fields below and fill in anything it missed.",
      });
    } catch (err) {
      setNote({ type: "error", message: "Couldn't read that PDF. You can still fill the form in by hand." });
    } finally {
      setParsing(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nom || !form.whatsapp_id) {
      setNote({ type: "error", message: "Name and WhatsApp number are required." });
      return;
    }

    setSubmitting(true);
    setNote(null);
    try {
      try {
        await api.post("/utilisateurs/", { whatsapp_id: form.whatsapp_id, nom: form.nom });
      } catch (err) {
        if (!/existe déjà|already exists/i.test(err.message)) throw err;
      }

      await api.post("/profils/", {
        whatsapp_id: form.whatsapp_id,
        track: form.track || null,
        ville: form.ville || null,
        interets: form.interets
          ? form.interets.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        cv_summary: form.cv_summary || null,
      });

      setForm(emptyForm);
      toast.success("Profile created.");
      setNote({ type: "success", message: "Profile created. The agent will pick up right where this left off on WhatsApp." });
    } catch (err) {
      toast.error(err.message);
      setNote({ type: "error", message: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  const input =
    "w-full rounded-md border border-line bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-teal/40 focus:border-teal";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-line bg-white p-7 shadow-[0_30px_60px_-30px_rgba(20,32,28,0.25)]"
    >
      <label
        htmlFor="resume-upload"
        className={`flex cursor-pointer items-center justify-between gap-3 rounded-md border border-dashed border-line bg-paper px-4 py-3.5 text-sm transition-colors hover:border-teal ${
          parsing ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <span className="text-ink/70">
          {parsing
            ? "Reading your résumé…"
            : resumeFileName
            ? `Loaded: ${resumeFileName} — upload another to replace`
            : "Upload your résumé (PDF) to fill the form automatically"}
        </span>
        <span className="shrink-0 rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-paper">Choose file</span>
        <input
          id="resume-upload"
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleResumeUpload}
          disabled={parsing}
        />
      </label>
      <p className="mt-1.5 text-xs text-ink/40">
        Parsed entirely in your browser — the PDF is never uploaded anywhere.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm text-ink/70">Full name</label>
          <input className={input} type="text" required value={form.nom} onChange={(e) => update("nom", e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-ink/70">WhatsApp number</label>
          <input
            className={input}
            type="tel"
            required
            placeholder="212600000000"
            value={form.whatsapp_id}
            onChange={(e) => update("whatsapp_id", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-ink/70">Your goal</label>
          <input
            className={input}
            type="text"
            placeholder="e.g. Master's in Canada"
            value={form.track}
            onChange={(e) => update("track", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-ink/70">City</label>
          <input className={input} type="text" value={form.ville} onChange={(e) => update("ville", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm text-ink/70">Interests</label>
          <input
            className={input}
            type="text"
            placeholder="e.g. AI, design, public health"
            value={form.interets}
            onChange={(e) => update("interets", e.target.value)}
          />
          <p className="mt-1.5 text-xs text-ink/40">Separate with commas.</p>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm text-ink/70">CV summary</label>
          <textarea
            className={input}
            rows={4}
            placeholder="A few lines on your background, skills, and experience so far."
            value={form.cv_summary}
            onChange={(e) => update("cv_summary", e.target.value)}
          />
        </div>
      </div>

      {note && (
        <p
          className={`mt-4 rounded-md px-3 py-2 text-sm ${
            note.type === "success" ? "bg-teal/10 text-teal" : "bg-danger/10 text-danger"
          }`}
        >
          {note.message}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-5 w-full rounded-md bg-ink px-4 py-3 text-sm font-medium text-paper transition-colors hover:bg-teal disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create my profile"}
      </button>
    </form>
  );
}
