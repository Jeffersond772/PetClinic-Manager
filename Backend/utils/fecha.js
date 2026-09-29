// Calcula la fecha de HOY en la zona horaria de Colombia, sin importar
// en qué zona horaria esté configurado el servidor (Render corre en UTC).
function obtenerFechaHoyLocal() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}

module.exports = { obtenerFechaHoyLocal };

module.exports = { obtenerFechaHoyLocal };