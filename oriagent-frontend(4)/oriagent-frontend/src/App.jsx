import { Routes, Route, useNavigate } from "react-router-dom";
import AdminLayout from "./layouts/AdminLayout";
import ResourceCrud from "./components/ResourceCrud";
import Dashboard from "./pages/Dashboard";
import ProfilDetail from "./pages/ProfilDetail";
import Home from "./pages/Home";
import { ToastProvider } from "./context/ToastContext";

function ProfilsPage() {
  const navigate = useNavigate();
  return <ResourceCrud resourceKey="profils" onRowClick={(item) => navigate(`/console/profils/${item.id}`)} />;
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/console" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="utilisateurs" element={<ResourceCrud resourceKey="utilisateurs" />} />
          <Route path="profils" element={<ProfilsPage />} />
          <Route path="profils/:id" element={<ProfilDetail />} />
          <Route path="filieres" element={<ResourceCrud resourceKey="filieres" />} />
          <Route path="debouches" element={<ResourceCrud resourceKey="debouches" />} />
          <Route path="offres" element={<ResourceCrud resourceKey="offres" />} />
          <Route path="formations" element={<ResourceCrud resourceKey="formations" />} />
          <Route path="rapports" element={<ResourceCrud resourceKey="rapports" />} />
          <Route path="rappels" element={<ResourceCrud resourceKey="event_reminders" />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
