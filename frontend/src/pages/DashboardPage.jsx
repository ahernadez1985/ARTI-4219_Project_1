import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PluginCard from '../components/PluginCard';

export default function DashboardPage() {
  const { user, client, plugins, logout } = useAuth();
  const navigate = useNavigate();

  if (!client || !plugins) {
    return <div style={{ padding: 40, fontFamily: 'system-ui, sans-serif' }}>Cargando plugins del cliente…</div>;
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', fontFamily: 'system-ui, sans-serif', color: '#18181b' }}>
      <div
        style={{
          height: 68,
          background: client.theme.primaryColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: client.theme.secondaryColor,
              color: client.theme.primaryColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 15
            }}
          >
            {client.theme.logoInitials}
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{client.clientName}</div>
            <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 11.5 }}>{client.environment}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: 'rgba(255,255,255,.85)', fontSize: 13 }}>{user?.name}</span>
          <button
            onClick={handleLogout}
            style={{
              padding: '7px 14px',
              borderRadius: 7,
              border: '1px solid rgba(255,255,255,.35)',
              background: 'transparent',
              color: '#fff',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '36px 24px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700 }}>Plugins habilitados</h1>
        <div style={{ fontSize: 13.5, color: '#71717a', marginBottom: 24 }}>
          Cargados dinámicamente desde <code>/api/v1/clients/me/plugins</code> al iniciar sesión — cada tarjeta apunta a la
          versión de API que le corresponde a {client.clientName}.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
          {plugins.map((plugin) => (
            <PluginCard key={plugin.key} plugin={plugin} theme={client.theme} />
          ))}
        </div>
      </div>
    </div>
  );
}
