import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';

export default function PluginLimitesPage() {
  const { token, client, getPlugin } = useAuth();
  const plugin = getPlugin('limites');
  const [limitsPayload, setLimitsPayload] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [error, setError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    if (!plugin) return;
    Promise.all([
      apiFetch(`${plugin.baseUrl}/limits`, { token }),
      apiFetch(`${plugin.baseUrl}/alerts`, { token })
    ])
      .then(([limitsRes, alertsRes]) => {
        setLimitsPayload(limitsRes);
        setAlerts(alertsRes.alerts);
      })
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plugin?.baseUrl]);

  async function handleToggle(alertId) {
    if (!plugin) return;
    setTogglingId(alertId);
    try {
      const updated = await apiFetch(`${plugin.baseUrl}/alerts/${alertId}`, { method: 'PATCH', token });
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? updated : a)));
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingId(null);
    }
  }

  // v1.1+: ajustar el monto máximo (meta.editable). Devuelve el mensaje de
  // error del backend para mostrarlo junto al límite, o null si guardó.
  async function handleSaveLimit(limitId, montoMaximo) {
    try {
      const updated = await apiFetch(`${plugin.baseUrl}/limits/${limitId}`, {
        method: 'PATCH',
        token,
        body: { montoMaximo }
      });
      setLimitsPayload((prev) => ({
        ...prev,
        limits: prev.limits.map((l) => (l.id === limitId ? updated : l))
      }));
      return null;
    } catch (err) {
      return err.message;
    }
  }

  if (!plugin) return <Shell client={client}>Este cliente no tiene el plugin de límites y alertas habilitado.</Shell>;
  if (error) return <Shell client={client}>Error: {error}</Shell>;
  if (!limitsPayload || !alerts) return <Shell client={client}>Cargando…</Shell>;

  return (
    <Shell client={client} title={limitsPayload.meta.title} version={limitsPayload.version}>
      <div style={{ fontSize: 12.5, color: '#71717a', marginBottom: 22 }}>{limitsPayload.meta.description}</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {limitsPayload.limits.map((lim) => {
            const pct = Math.min(100, Math.round((lim.montoActual / lim.montoMaximo) * 100));
            const warn = pct >= 80;
            return (
              <div key={lim.id} style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>{lim.canal}</span>
                  <span style={{ color: '#71717a' }}>
                    ${lim.montoActual.toLocaleString('es-CO')} / ${lim.montoMaximo.toLocaleString('es-CO')} {lim.moneda}
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: '#f0f0f0', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: warn ? '#dc2626' : client.theme.primaryColor,
                      transition: 'width .2s ease'
                    }}
                  />
                </div>
                {limitsPayload.meta.editable && (
                  <LimitEditor limit={lim} color={client.theme.primaryColor} onSave={handleSaveLimit} />
                )}
              </div>
            );
          })}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#3f3f46', textTransform: 'uppercase', letterSpacing: '.03em' }}>Alertas</div>
          {alerts.map((alert) => (
            <div key={alert.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, padding: '10px 0', borderBottom: '1px solid #f4f4f5' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{alert.criterio}</div>
                <div style={{ fontSize: 11.5, color: '#a1a1aa' }}>{alert.canalNotificacion}</div>
              </div>
              <button
                onClick={() => handleToggle(alert.id)}
                disabled={togglingId === alert.id}
                style={{
                  flexShrink: 0,
                  width: 40,
                  height: 22,
                  borderRadius: 999,
                  border: 'none',
                  background: alert.activa ? client.theme.primaryColor : '#d4d4d8',
                  position: 'relative',
                  cursor: 'pointer'
                }}
                aria-label={alert.activa ? 'Desactivar alerta' : 'Activar alerta'}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: alert.activa ? 20 : 2,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left .15s ease'
                  }}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

function LimitEditor({ limit, color, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(limit.montoMaximo));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!editing) {
    return (
      <button
        onClick={() => {
          setValue(String(limit.montoMaximo));
          setError(null);
          setEditing(true);
        }}
        style={{ marginTop: 10, background: 'none', border: 'none', padding: 0, color, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
      >
        Ajustar límite
      </button>
    );
  }

  async function save() {
    setSaving(true);
    const message = await onSave(limit.id, Number(value));
    setSaving(false);
    if (message) setError(message);
    else setEditing(false);
  }

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#71717a' }}>$</span>
        <input
          type="number"
          min={limit.montoActual}
          step={50000}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid #d4d4d8', fontSize: 13 }}
          aria-label={`Nuevo monto máximo para ${limit.canal}`}
        />
        <button
          onClick={save}
          disabled={saving}
          style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: color, color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          onClick={() => setEditing(false)}
          disabled={saving}
          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #d4d4d8', background: '#fff', fontSize: 12.5, cursor: 'pointer' }}
        >
          Cancelar
        </button>
      </div>
      {error && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>{error}</div>}
    </div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
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
