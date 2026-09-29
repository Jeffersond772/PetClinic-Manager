// Hora actual en Colombia como "HH:MM:SS", mismo formato que las columnas
// hora_inicio_laboral / hora_fin_laboral de la tabla usuarios.
function obtenerHoraActualLocal() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Bogota',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).format(new Date());
}

module.exports = { obtenerHoraActualLocal };