// Configuración de plugins para el cliente Banco Andino: qué plugins tiene
// habilitados, en qué versión, y a qué API (versionada) debe apuntar el
// frontend para consumir cada uno.

module.exports = {
  clientId: 'BA-004821',
  clientName: 'Banco Andino',
  environment: 'Producción',
  theme: { primaryColor: '#2E3F68', secondaryColor: '#D6B24B', logoInitials: 'BA' },
  plugins: [
    {
      key: 'transacciones',
      name: 'Últimas Transacciones',
      version: '2.4',
      baseUrl: '/api/plugins/transacciones/v2.4',
      status: 'configurado'
    },
    {
      key: 'certificados',
      name: 'Generar Certificados',
      version: '1.8',
      baseUrl: '/api/plugins/certificados/v1.8',
      status: 'configurado'
    },
    {
      key: 'limites',
      name: 'Límites y Alertas',
      version: '1.1',
      baseUrl: '/api/plugins/limites/v1.1',
      status: 'actualizado'
    }
  ]
};
