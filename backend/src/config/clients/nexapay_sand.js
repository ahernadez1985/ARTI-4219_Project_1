// Configuración de plugins para el cliente NexaPay: qué plugins tiene
// habilitados, en qué versión, y a qué API (versionada) debe apuntar el
// frontend para consumir cada uno.

module.exports = {
  clientId: 'NX-11029',
  clientName: 'NexaPay',
  environment: 'Sandbox',
  theme: { primaryColor: '#0E9CA6', secondaryColor: '#8A3FFC', logoInitials: 'N' },
  plugins: [
    {
      key: 'transacciones',
      name: 'Últimas Transacciones',
      version: '3.1',
      baseUrl: '/api/plugins/transacciones/v3.1',
      status: 'activo'
    },
    {
      key: 'certificados',
      name: 'Generar Certificados',
      version: '1.3',
      baseUrl: '/api/plugins/certificados/v1.3',
      status: 'activo'
    }
  ]
};
