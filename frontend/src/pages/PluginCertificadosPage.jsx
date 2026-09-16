import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';

export default function PluginCertificadosPage() {
  const { token, client, getPlugin } = useAuth();
  const plugin = getPlugin('certificados');
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);
  const [selectedTypeId, setSelectedTypeId] = useState(null);
  const [language, setLanguage] = useState(null);
  const [result, setResult] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState(null);

  useEffect(() => {
    if (!plugin) return;
    apiFetch(`${plugin.baseUrl}/types`, { token })
      .then((data) => {
        setPayload(data);
        setSelectedTypeId(data.types[0]?.id || null);
        setLanguage(data.meta.languages[0] || null);
        // El historial es una capacidad nueva (v1.3): solo se pide si esta
        // versión la anuncia en meta.history, no todas las versiones la tienen.
        if (data.meta.history) loadHistory();
      })
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plugin?.baseUrl]);

  function loadHistory() {
    if (!plugin) return;
    apiFetch(`${plugin.baseUrl}/history`, { token })
      .then((data) => setHistory(data.history))
      .catch((err) => setError(err.message));
  }

  async function handleGenerate() {
    if (!plugin || !selectedTypeId) return;
    setGenerating(true);
    setResult(null);
    try {
      const res = await apiFetch(`${plugin.baseUrl}/generate`, {
        method: 'POST',
        token,
        body: { typeId: selectedTypeId, language }
      });
      setResult(res);
      if (payload?.meta.history) loadHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  if (!plugin) return <Shell client={client}>Este cliente no tiene el plugin de certificados habilitado.</Shell>;
  if (error) return <Shell client={client}>Error: {error}</Shell>;
  if (!payload) return <Shell client={client}>Cargando…</Shell>;

  const { meta, types } = payload;

  return (
    <Shell client={client} title={meta.title} version={payload.version}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {types.map((type) => (
            <label
              key={type.id}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
                background: '#fff',
                border: selectedTypeId === type.id ? `2px solid ${client.theme.primaryColor}` : '1px solid #e4e4e7',
                borderRadius: 12,
                padding: '14px 16px',
                cursor: 'pointer'
              }}
            >
              <input
                type="radio"
                name="certType"
                checked={selectedTypeId === type.id}
                onChange={() => setSelectedTypeId(type.id)}
                style={{ marginTop: 3 }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{type.name}</div>
                <div style={{ fontSize: 12.5, color: '#71717a' }}>{type.description}</div>
              </div>
            </label>
          ))}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {meta.languages.length > 1 && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, fontWeight: 600 }}>
              Idioma
              <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ padding: '9px 10px', borderRadius: 8, border: '1px solid #d4d4d8' }}>
                {meta.languages.map((lng) => (
                  <option key={lng} value={lng}>
                    {lng === 'ES' ? 'Español' : 'English'}
                  </option>
                ))}
              </select>
            </label>
          )}

          {meta.signDigital && (
            <div style={{ fontSize: 12, color: '#3f3f46', background: '#f4f4f5', padding: 12, borderRadius: 8 }}>
              Este documento se firma digitalmente antes de entregarse.
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating || !selectedTypeId}
            style={{
              padding: 12,
              borderRadius: 9,
              border: 'none',
              background: client.theme.primaryColor,
              color: '#fff',
              fontWeight: 700,
              fontSize: 13.5,
              cursor: generating ? 'default' : 'pointer',
              opacity: generating ? 0.7 : 1
            }}
          >
            {generating ? 'Generando…' : 'Generar certificado'}
          </button>

          {result && (
            <div style={{ fontSize: 12.5, background: '#dcfce7', color: '#15803d', padding: 12, borderRadius: 8 }}>
              Generado: <strong>{result.certificateId}</strong>
              {meta.preview && <div style={{ marginTop: 4 }}>Vista previa disponible en {result.downloadUrl}</div>}
            </div>
          )}
        </div>
      </div>

      {meta.history && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Historial de certificados generados</div>
          {!history ? (
            <div style={{ fontSize: 12.5, color: '#71717a' }}>Cargando historial…</div>
          ) : history.length === 0 ? (
            <div style={{ fontSize: 12.5, color: '#71717a' }}>Todavía no has generado ningún certificado.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.map((item) => (
                <div
                  key={item.certificateId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#fff',
                    border: '1px solid #e4e4e7',
                    borderRadius: 10,
                    padding: '10px 14px',
                    fontSize: 12.5
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.typeName}</div>
                    <div style={{ color: '#a1a1aa', fontSize: 11.5 }}>{item.certificateId}</div>
                  </div>
                  <div style={{ color: '#71717a' }}>{new Date(item.issuedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}

function Shell({ client, title, version, children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', fontFamily: 'system-ui, sans-serif', color: '#18181b' }}>
      <div style={{ height: 68, background: client?.theme?.primaryColor || '#18181b', display: 'flex', alignItems: 'center', padding: '0 32px' }}>
        <Link to="/dashboard" style={{ color: '#fff', fontSize: 13, textDecoration: 'none' }}>
          ← Volver al panel
        </Link>
      </div>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{title}</h1>
            {version && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: '#eee', color: '#3f3f46' }}>
                v{version}
              </span>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
