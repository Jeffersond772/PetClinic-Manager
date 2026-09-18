// Calcula la fecha de HOY según la hora local del servidor (no UTC).
// new Date().toISOString() siempre usa UTC, lo que corre la fecha un día
// en zonas horarias negativas (como Colombia, UTC-5) durante ciertas horas.
function obtenerFechaHoyLocal() {
  const ahora = new Date();
  const año = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

module.exports = { obtenerFechaHoyLocal };