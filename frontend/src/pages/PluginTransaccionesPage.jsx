import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';
import DynamicTable from '../components/DynamicTable';

export default function PluginTransaccionesPage() {
  const { token, client, getPlugin } = useAuth();
  const plugin = getPlugin('transacciones');
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!plugin) return;
    // La URL NUNCA se hardcodea: viene del manifiesto (`plugin.baseUrl`), que
    // ya resuelve a /v2.3 o /v3.1 según lo que tenga habilitado este cliente.
    apiFetch(`${plugin.baseUrl}/transactions`, { token })
      .then(setPayload)
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plugin?.baseUrl]);

  if (!plugin) return <PluginShell client={client}>Este cliente no tiene el plugin de transacciones habilitado.</PluginShell>;
  if (error) return <PluginShell client={client}>Error: {error}</PluginShell>;
  if (!payload) return <PluginShell client={client}>Cargando…</PluginShell>;

  const { meta, data } = payload;

  return (
    <PluginShell client={client} title={meta.title} version={payload.version}>
      <div style={{ fontSize: 12.5, color: '#71717a', marginBottom: 18 }}>
        Filtros disponibles en esta versión: {meta.filters.join(', ')}
        {meta.exportFormats && <> · Exportar: {meta.exportFormats.join(', ')}</>}
        {meta.categories && <> · Categorías: {meta.categories.join(', ')}</>}
      </div>

      {meta.style === 'tarjetas' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.map((row, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#fff',
                border: '1px solid #e4e4e7',
                borderRadius: 12,
                padding: '14px 18px'
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{row.comercio}</div>
                <div style={{ fontSize: 12, color: '#71717a' }}>
                  {row.categoria} · {row.fecha}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: row.estado === 'Completada' ? '#dcfce7' : '#fef3c7',
                    color: row.estado === 'Completada' ? '#15803d' : '#a16207'
                  }}
                >
                  {row.estado}
                </span>
                <span style={{ fontWeight: 700, color: row.monto < 0 ? '#dc2626' : '#16a34a', minWidth: 110, textAlign: 'right' }}>
                  {row.monto < 0 ? '-' : '+'} ${Math.abs(row.monto).toLocaleString('es-CO')}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DynamicTable columns={meta.columns} rows={data} />
      )}
    </PluginShell>
  );
}

function PluginShell({ client, title, version, children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', fontFamily: 'system-ui, sans-serif', color: '#18181b' }}>
      <div style={{ height: 68, background: client?.theme?.primaryColor || '#18181b', display: 'flex', alignItems: 'center', padding: '0 32px' }}>
        <Link to="/dashboard" style={{ color: '#fff', fontSize: 13, textDecoration: 'none' }}>
          ← Volver al panel
        </Link>
      </div>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{title}</h1>
            {version && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 9px',
                  borderRadius: 999,
                  background: '#eee',
                  color: '#3f3f46'
                }}
              >
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
