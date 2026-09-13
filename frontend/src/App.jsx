import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PluginTransaccionesPage from './pages/PluginTransaccionesPage';
import PluginCertificadosPage from './pages/PluginCertificadosPage';

const PLUGIN_PAGES = {
  transacciones: PluginTransaccionesPage,
  certificados: PluginCertificadosPage
};

function PluginRouter() {
  // El :key de la ruta decide qué página de plugin renderizar. Cada página
  // resuelve por su cuenta la versión/API correcta desde el manifiesto
  // (AuthContext -> getPlugin), así que agregar un plugin nuevo al backend
  // no requiere tocar este router salvo registrar su componente arriba.
  return (
    <Routes>
      {Object.entries(PLUGIN_PAGES).map(([key, Component]) => (
        <Route key={key} path={key} element={<Component />} />
      ))}
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plugin/*"
            element={
              <ProtectedRoute>
                <PluginRouter />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
