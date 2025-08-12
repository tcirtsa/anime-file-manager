import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "./components/Layout";
import ImportPage from "./pages/ImportPage";
import SettingsPage from "./pages/SettingsPage";
import LogsPage from "./pages/LogsPage";

function App() {
  return (
    <>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/import" replace />} />
            <Route path="import" element={<ImportPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="logs" element={<LogsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
      <Toaster />
    </>
  );
}

export default App;
