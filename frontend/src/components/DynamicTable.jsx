// Tabla genérica: no conoce de antemano las columnas de ninguna versión del
// plugin de transacciones. Las recibe en `columns` (viene de meta.columns de
// la API versionada) y simplemente las pinta. Así, si una versión agrega o
// quita una columna, esta tabla se adapta sin cambios de código.

function formatValue(value, column) {
  if (column.key === 'monto' && typeof value === 'number') {
    const sign = value < 0 ? '-' : value > 0 ? '+' : '';
    const abs = Math.abs(value).toLocaleString('es-CO');
    return `${sign} $${abs}`;
  }
  return value;
}

export default function DynamicTable({ columns, rows }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: 12, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #eee' }}>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  textAlign: col.align || 'left',
                  padding: '12px 20px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#71717a',
                  textTransform: 'uppercase',
                  letterSpacing: '.03em'
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid #f4f4f5' : 'none' }}>
              {columns.map((col) => (
                <td key={col.key} style={{ padding: '13px 20px', textAlign: col.align || 'left' }}>
                  {formatValue(row[col.key], col)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
