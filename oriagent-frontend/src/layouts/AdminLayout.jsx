import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-paper text-ink">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line px-4 py-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1.5 text-ink/70 hover:bg-ink/5"
            aria-label="Ouvrir le menu"
          >
            ☰
          </button>
          <span className="font-display text-lg text-ink">OriAgent</span>
        </header>
        <main className="flex-1 overflow-y-auto px-5 py-8 sm:px-10 sm:py-10">
          <div className="mx-auto max-w-4xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
