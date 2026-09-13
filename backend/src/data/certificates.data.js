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
    preview: true
  },
  types: [
    { id: 'cuenta', name: 'Certificado de Cuenta', description: 'Confirma titularidad, número de cuenta y fecha de apertura.' },
    { id: 'movimientos', name: 'Certificado de Movimientos', description: 'Resumen de movimientos de los últimos 6 meses.' }
  ]
};

function getCertificateCatalog(version) {
  if (version === '1.8') return CERTIFICADOS_V1_8;
  if (version === '1.2') return CERTIFICADOS_V1_2;
  return null;
}

function generateCertificate(version, typeId) {
  const catalog = getCertificateCatalog(version);
  const type = catalog ? catalog.types.find((t) => t.id === typeId) : null;
  if (!type) return null;

  return {
    certificateId: `CERT-${version}-${Date.now()}`,
    type: type.id,
    typeName: type.name,
    issuedAt: new Date().toISOString(),
    downloadUrl: `/mock-files/certificado-${type.id}-v${version}.pdf`
  };
}

module.exports = { getCertificateCatalog, generateCertificate };
