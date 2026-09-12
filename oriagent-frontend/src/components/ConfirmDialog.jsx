export default function ConfirmDialog({ open, title, message, confirmLabel = "Confirmer", onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 px-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-line bg-paper p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg text-ink">{title}</h3>
        <p className="mt-2 text-sm text-ink/70">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md border border-line px-3 py-1.5 text-sm text-ink/70 hover:bg-ink/5"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-danger px-3 py-1.5 text-sm font-medium text-paper hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
