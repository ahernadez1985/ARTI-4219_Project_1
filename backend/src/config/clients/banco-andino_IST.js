module.exports = {
  clientId: 'BA-004821',
  clientName: 'Banco Andino',
  environment: 'IST',
  theme: { primaryColor: '#2E3F68', secondaryColor: '#D6B24B', logoInitials: 'BA' },
  plugins: [
    {
      key: 'transacciones',
      name: 'Últimas Transacciones',
      version: '3.0',
      baseUrl: '/api/plugins/transacciones/v3.0',
      status: 'configurado'
    },
    {
      key: 'certificados',
      name: 'Generar Certificados',
      version: '1.9',
      baseUrl: '/api/plugins/certificados/v1.9',
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
