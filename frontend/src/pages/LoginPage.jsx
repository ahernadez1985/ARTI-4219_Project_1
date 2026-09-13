import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_USERS = [
  { label: 'Banco Andino', email: 'm.restrepo@bancoandino.com', password: 'Andino#2026' },
  { label: 'NexaPay', email: 's.lozano@nexapay.io', password: 'Nexa#2026' }
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(demo) {
    setEmail(demo.email);
    setPassword(demo.password);
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f4f5f7',
        fontFamily: 'system-ui, sans-serif'
      }}
    >
      <div style={{ width: 380, background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 12px 32px rgba(0,0,0,.08)' }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700 }}>Portal de Plugins</h1>
        <div style={{ fontSize: 13, color: '#71717a', marginBottom: 24 }}>
          Inicia sesión para ver los plugins y versiones de tu cliente.
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#3f3f46' }}>
            Correo
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #d4d4d8', fontSize: 13.5 }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#3f3f46' }}>
            Contraseña
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #d4d4d8', fontSize: 13.5 }}
            />
          </label>

          {error && <div style={{ fontSize: 12.5, color: '#dc2626' }}>{error}</div>}

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: 12,
              borderRadius: 9,
              border: 'none',
              background: '#18181b',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              cursor: submitting ? 'default' : 'pointer',
              opacity: submitting ? 0.7 : 1
            }}
          >
            {submitting ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>

        <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid #eee' }}>
          <div style={{ fontSize: 11.5, color: '#a1a1aa', marginBottom: 8 }}>Usuarios de demostración</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {DEMO_USERS.map((demo) => (
              <button
                key={demo.email}
                type="button"
                onClick={() => fillDemo(demo)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #d4d4d8',
                  background: '#fafafa',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {demo.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
