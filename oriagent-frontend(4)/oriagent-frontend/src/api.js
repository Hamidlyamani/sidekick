const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    // fetch ne rejette que sur un échec réseau : API éteinte, mauvaise URL,
    // ou CORS bloqué par le navigateur. Le message natif est « Failed to
    // fetch », inutilisable. On dit ce qu'il faut faire.
    throw new Error(
      `Impossible de joindre l'API (${BASE_URL}). Vérifie qu'elle tourne :  cd apps/api && uvicorn app.main:app`,
    );
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      // FastAPI renvoie soit {detail: "..."} soit la liste d'erreurs 422.
      if (Array.isArray(body.detail)) {
        detail = body.detail
          .map((e) => `${e.loc?.slice(1).join(".") ?? "champ"} : ${e.msg}`)
          .join(" · ");
      } else {
        detail = body.detail || detail;
      }
    } catch {
      // pas de corps JSON, on garde le statusText
    }
    throw new Error(detail);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, data) =>
    request(path, {
      method: "POST",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  patch: (path, data) => request(path, { method: "PATCH", body: JSON.stringify(data) }),
  del: (path) => request(path, { method: "DELETE" }),
};
