// Datos simulados de "Generar Certificados", separados por versión de API.

const CERTIFICADOS_V1_8 = {
  plugin: 'certificados',
  version: '1.8',
  meta: {
    title: 'Generar Certificados',
    languages: ['ES', 'EN'],
    signDigital: true,
    preview: false
  },
  types: [
    { id: 'cuenta', name: 'Certificado de Cuenta Bancaria', description: 'Incluye número de cuenta, tipo, fecha de apertura y estado actual.' },
    { id: 'ingresos', name: 'Certificado de Ingresos y Retenciones', description: 'Resumen anual de ingresos reportados y retenciones aplicadas.' },
    { id: 'tributario', name: 'Certificado Tributario (Renta)', description: 'Documento válido para la declaración de renta ante la DIAN.' },
    { id: 'tarjeta', name: 'Certificado de Tarjeta de Crédito', description: 'Cupo, saldo actual y estado de la tarjeta principal.' },
    { id: 'paz-y-salvo', name: 'Certificado de Paz y Salvo', description: 'Confirma que el cliente no tiene obligaciones pendientes.' }
  ]
};

const CERTIFICADOS_V1_2 = {
  plugin: 'certificados',
  version: '1.2',
  meta: {
    title: 'Generar Certificados',
    languages: ['ES'],
    signDigital: false,
    preview: true,
    history: false
  },
  types: [
    { id: 'cuenta', name: 'Certificado de Cuenta', description: 'Confirma titularidad, número de cuenta y fecha de apertura.' },
    { id: 'movimientos', name: 'Certificado de Movimientos', description: 'Resumen de movimientos de los últimos 6 meses.' }
  ]
};

// v1.3 = mejora sobre v1.2: mismo catálogo, pero ahora el cliente puede
// consultar el historial de certificados que ya generó (meta.history true
// habilita esa sección en el frontend sin necesidad de una página distinta).
const CERTIFICADOS_V1_3 = {
  plugin: 'certificados',
  version: '1.3',
  meta: {
    title: 'Generar Certificados',
    languages: ['ES'],
    signDigital: false,
    preview: true,
    history: true
  },
  types: [
    { id: 'cuenta', name: 'Certificado de Cuenta', description: 'Confirma titularidad, número de cuenta y fecha de apertura.' },
    { id: 'movimientos', name: 'Certificado de Movimientos', description: 'Resumen de movimientos de los últimos 6 meses.' }
  ]
};

// Historial en memoria, sembrado con un par de certificados previos para que
// la sección de historial no arranque vacía en la demo.
const HISTORY_STORE = {
  '1.3': [
    { certificateId: 'CERT-1.3-1789000001', type: 'cuenta', typeName: 'Certificado de Cuenta', issuedAt: '2026-09-02T14:12:00.000Z' },
    { certificateId: 'CERT-1.3-1789000002', type: 'movimientos', typeName: 'Certificado de Movimientos', issuedAt: '2026-08-20T09:40:00.000Z' }
  ]
};

function getCertificateCatalog(version) {
  if (version === '1.8') return CERTIFICADOS_V1_8;
  if (version === '1.2') return CERTIFICADOS_V1_2;
  if (version === '1.3') return CERTIFICADOS_V1_3;
  return null;
}

function generateCertificate(version, typeId) {
  const catalog = getCertificateCatalog(version);
  const type = catalog ? catalog.types.find((t) => t.id === typeId) : null;
  if (!type) return null;

  const certificate = {
    certificateId: `CERT-${version}-${Date.now()}`,
    type: type.id,
    typeName: type.name,
    issuedAt: new Date().toISOString(),
    downloadUrl: `/mock-files/certificado-${type.id}-v${version}.pdf`
  };

  if (catalog.meta.history) {
    if (!HISTORY_STORE[version]) HISTORY_STORE[version] = [];
    HISTORY_STORE[version].unshift(certificate);
  }

  return certificate;
}

function getCertificateHistory(version) {
  return HISTORY_STORE[version] || [];
}

module.exports = { getCertificateCatalog, generateCertificate, getCertificateHistory };
