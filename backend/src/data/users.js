const bcrypt = require('bcryptjs');

// Usuarios simulados (prototipo). En producción esto vendría de una base de datos
// y las contraseñas nunca se generarían en el arranque del proceso.
const USERS = [
  {
    id: 'u-ba-1',
    email: 'm.restrepo@bancoandino.com',
    passwordHash: bcrypt.hashSync('Andino#2026', 10),
    name: 'M. Restrepo',
    clientId: 'BA-004821'
  },
  {
    id: 'u-nx-1',
    email: 's.lozano@nexapay.io',
    passwordHash: bcrypt.hashSync('Nexa#2026', 10),
    name: 'S. Lozano',
    clientId: 'NX-11029'
  }
];

function findByEmail(email) {
  return USERS.find((u) => u.email.toLowerCase() === String(email || '').toLowerCase());
}

function findById(id) {
  return USERS.find((u) => u.id === id);
}

module.exports = { USERS, findByEmail, findById };
