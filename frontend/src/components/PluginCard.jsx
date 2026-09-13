import { Link } from 'react-router-dom';

export default function PluginCard({ plugin, theme }) {
  return (
    <Link
      to={`/plugin/${plugin.key}`}
      style={{
        display: 'block',
        background: '#fff',
        border: '1px solid #e4e4e7',
        borderRadius: 16,
        padding: 22,
        textDecoration: 'none',
        color: 'inherit'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{plugin.name}</div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 9px',
            borderRadius: 999,
            background: `${theme.primaryColor}1a`,
            color: theme.primaryColor
          }}
        >
          v{plugin.version}
        </span>
      </div>
      <div style={{ fontSize: 12.5, color: '#71717a', marginBottom: 14 }}>
        API: <code>{plugin.baseUrl}</code>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>● {plugin.status}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: theme.primaryColor }}>Abrir módulo →</span>
      </div>
    </Link>
  );
}
