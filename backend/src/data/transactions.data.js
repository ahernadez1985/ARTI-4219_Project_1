// Datos simulados de "Últimas Transacciones", separados por versión de API.
// Cada versión define sus propias columnas (meta.columns) para que el frontend
// pueda renderizar la tabla/lista de forma genérica, sin conocer de antemano
// la forma exacta de los datos de esa versión.

const TRANSACCIONES_V2_3 = {
  plugin: 'transacciones',
  version: '2.3',
  meta: {
    title: 'Últimas Transacciones',
    style: 'tabla',
    filters: ['rangoFechas', 'tipo', 'canal'],
    exportFormats: ['PDF', 'Excel'],
    columns: [
      { key: 'fecha', label: 'Fecha' },
      { key: 'hora', label: 'Hora' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'canal', label: 'Canal' },
      { key: 'descripcion', label: 'Descripción' },
      { key: 'monto', label: 'Monto', align: 'right' },
      { key: 'estado', label: 'Estado' }
    ]
  },
  data: [
    { fecha: '13 sep', hora: '09:41', tipo: 'Pago PSE', canal: 'Online', descripcion: 'Suscripción · Claro Hogar', monto: -148500, estado: 'Aprobada' },
    { fecha: '12 sep', hora: '18:07', tipo: 'Retiro ATM', canal: 'ATM', descripcion: 'Cajero Calle 100 #15-20', monto: -300000, estado: 'Aprobada' },
    { fecha: '12 sep', hora: '14:22', tipo: 'Compra POS', canal: 'POS', descripcion: 'Éxito Colina', monto: -212340, estado: 'Aprobada' },
    { fecha: '11 sep', hora: '08:00', tipo: 'Consignación', canal: 'Sucursal', descripcion: 'Consignación en efectivo', monto: 1500000, estado: 'Aprobada' },
    { fecha: '10 sep', hora: '21:15', tipo: 'Compra internacional', canal: 'Online', descripcion: 'Amazon.com · USD 42,00', monto: -178960, estado: 'Pendiente' },
    { fecha: '09 sep', hora: '07:30', tipo: 'Pago de nómina', canal: 'Interbancario', descripcion: 'ACI Worldwide S.A.', monto: 4850000, estado: 'Aprobada' },
    { fecha: '08 sep', hora: '16:48', tipo: 'Reverso', canal: 'POS', descripcion: 'Reverso · Falabella', monto: 96000, estado: 'Rechazada' }
  ]
};

const TRANSACCIONES_V3_1 = {
  plugin: 'transacciones',
  version: '3.1',
  meta: {
    title: 'Últimas Transacciones',
    style: 'tarjetas',
    filters: ['busqueda', 'categoria', 'rango'],
    categories: ['Compras', 'Transferencias', 'Suscripciones', 'Retiros'],
    columns: [
      { key: 'comercio', label: 'Comercio' },
      { key: 'categoria', label: 'Categoría' },
      { key: 'fecha', label: 'Fecha' },
      { key: 'estado', label: 'Estado' },
      { key: 'monto', label: 'Monto', align: 'right' }
    ]
  },
  data: [
    { comercio: 'Rappi', categoria: 'Compras', fecha: 'Hoy · hace 34 min', estado: 'Completada', monto: -63900 },
    { comercio: 'Transferencia a Juan Pérez', categoria: 'Transferencias', fecha: 'Hoy · hace 2 horas', estado: 'Procesando', monto: -250000 },
    { comercio: 'Spotify Premium', categoria: 'Suscripciones', fecha: 'Hoy · hace 5 horas', estado: 'Completada', monto: -19900 },
    { comercio: 'Nómina · Estudio Creativo SAS', categoria: 'Transferencias', fecha: 'Ayer · 8:03 a. m.', estado: 'Completada', monto: 3200000 },
    { comercio: 'Retiro sin tarjeta', categoria: 'Retiros', fecha: 'Ayer · 6:40 p. m.', estado: 'Completada', monto: -150000 }
  ]
};

// v2.4 = mejora sobre v2.3: misma tabla, más una columna de referencia y un
// resumen (ingresos, egresos y neto) calculado en el backend. meta.summary
// habilita el resumen en el frontend; la columna nueva la pinta la tabla
// genérica sin cambios de código.
const TRANSACCIONES_V2_4_DATA = [
  { fecha: '13 sep', hora: '09:41', referencia: 'PSE-88213045', tipo: 'Pago PSE', canal: 'Online', descripcion: 'Suscripción · Claro Hogar', monto: -148500, estado: 'Aprobada' },
  { fecha: '12 sep', hora: '18:07', referencia: 'ATM-00417722', tipo: 'Retiro ATM', canal: 'ATM', descripcion: 'Cajero Calle 100 #15-20', monto: -300000, estado: 'Aprobada' },
  { fecha: '12 sep', hora: '14:22', referencia: 'POS-55190876', tipo: 'Compra POS', canal: 'POS', descripcion: 'Éxito Colina', monto: -212340, estado: 'Aprobada' },
  { fecha: '11 sep', hora: '08:00', referencia: 'SUC-10022341', tipo: 'Consignación', canal: 'Sucursal', descripcion: 'Consignación en efectivo', monto: 1500000, estado: 'Aprobada' },
  { fecha: '10 sep', hora: '21:15', referencia: 'INT-73310459', tipo: 'Compra internacional', canal: 'Online', descripcion: 'Amazon.com · USD 42,00', monto: -178960, estado: 'Pendiente' },
  { fecha: '09 sep', hora: '07:30', referencia: 'ACH-40987112', tipo: 'Pago de nómina', canal: 'Interbancario', descripcion: 'ACI Worldwide S.A.', monto: 4850000, estado: 'Aprobada' },
  { fecha: '08 sep', hora: '16:48', referencia: 'POS-55102233', tipo: 'Reverso', canal: 'POS', descripcion: 'Reverso · Falabella', monto: 96000, estado: 'Rechazada' }
];

function summarize(rows) {
  // Solo cuentan los movimientos aprobados (los pendientes y rechazados no
  // han afectado el saldo).
  const aprobadas = rows.filter((r) => r.estado === 'Aprobada');
  const ingresos = aprobadas.filter((r) => r.monto > 0).reduce((acc, r) => acc + r.monto, 0);
  const egresos = aprobadas.filter((r) => r.monto < 0).reduce((acc, r) => acc + r.monto, 0);
  return { ingresos, egresos, neto: ingresos + egresos, moneda: 'COP', movimientosAprobados: aprobadas.length };
}

const TRANSACCIONES_V2_4 = {
  plugin: 'transacciones',
  version: '2.4',
  meta: {
    title: 'Últimas Transacciones',
    style: 'tabla',
    filters: ['rangoFechas', 'tipo', 'canal', 'referencia'],
    exportFormats: ['PDF', 'Excel', 'CSV'],
    summary: true,
    columns: [
      { key: 'fecha', label: 'Fecha' },
      { key: 'hora', label: 'Hora' },
      { key: 'referencia', label: 'Referencia' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'canal', label: 'Canal' },
      { key: 'descripcion', label: 'Descripción' },
      { key: 'monto', label: 'Monto', align: 'right' },
      { key: 'estado', label: 'Estado' }
    ]
  },
  summary: summarize(TRANSACCIONES_V2_4_DATA),
  data: TRANSACCIONES_V2_4_DATA
};

function getTransactions(version) {
  if (version === '2.3') return TRANSACCIONES_V2_3;
  if (version === '2.4') return TRANSACCIONES_V2_4;
  if (version === '3.1') return TRANSACCIONES_V3_1;
  return null;
}

module.exports = { getTransactions };
