import { Link } from "react-router-dom";

export default function StatCard({ label, value, to, loading }) {
  const content = (
    <div className="rounded-lg border border-line bg-white/50 p-4 transition-colors hover:border-gold/50">
      <p className="text-xs uppercase tracking-wide text-ink/50">{label}</p>
      {loading ? (
        <div className="skeleton mt-2 h-7 w-10 rounded bg-ink/10" />
      ) : (
        <p className="mt-1 font-display text-2xl text-ink">{value}</p>
      )}
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}
