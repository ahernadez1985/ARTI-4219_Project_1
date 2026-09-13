import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/client';

const TOKEN_STORAGE_KEY = 'ppl_token';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState(null);
  const [client, setClient] = useState(null); // { clientId, clientName, environment, theme }
  const [plugins, setPlugins] = useState(null); // manifiesto: [{ key, name, version, baseUrl, status }]
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState(null);

  // Al cargar (o recargar) la app con un token guardado, se revalida la sesión
  // y se vuelve a pedir el manifiesto de plugins: nunca se asume una versión
  // vieja guardada en el navegador.
  const loadSession = useCallback(async (activeToken) => {
    setLoading(true);
    setError(null);
    try {
      const me = await apiFetch('/api/v1/auth/me', { token: activeToken });
      setUser(me.user);
      setClient(me.client);

      const manifest = await apiFetch('/api/v1/clients/me/plugins', { token: activeToken });
      setPlugins(manifest.plugins);
    } catch (err) {
      // Token inválido/expirado: se limpia la sesión.
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setToken(null);
      setUser(null);
      setClient(null);
      setPlugins(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) loadSession(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    const result = await apiFetch('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password }
    });

    localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
    setToken(result.token);
    setUser(result.user);
    setClient(result.client);

    // Justo después de iniciar sesión, se carga el manifiesto de plugins
    // (versión + API a consumir por cada uno) para este cliente.
    const manifest = await apiFetch('/api/v1/clients/me/plugins', { token: result.token });
    setPlugins(manifest.plugins);

    return result;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setClient(null);
    setPlugins(null);
  }, []);

  const getPlugin = useCallback(
    (key) => (plugins || []).find((p) => p.key === key) || null,
    [plugins]
  );

  const value = useMemo(
    () => ({
      token,
      user,
      client,
      plugins,
      loading,
      error,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      getPlugin
    }),
    [token, user, client, plugins, loading, error, login, logout, getPlugin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
