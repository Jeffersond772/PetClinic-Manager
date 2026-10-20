const citaModel = require('../models/cita.model');

const ZONA_HORARIA = process.env.CLINIC_TIMEZONE || 'America/Bogota';
const INTERVALO_MS = 60 * 1000;
let intervalo = null;
let ejecutando = false;

function obtenerFechaHoraLocal() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: ZONA_HORARIA,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).format(new Date());
}

async function revisarCitasVencidas() {
  if (ejecutando) return;
  ejecutando = true;
  try {
    const canceladas = await citaModel.cancelarCitasVencidas(obtenerFechaHoraLocal());
    if (canceladas > 0) console.log(`Citas vencidas canceladas automáticamente: ${canceladas}`);
  } catch (error) {
    console.error('No se pudieron actualizar las citas vencidas:', error.message);
  } finally {
    ejecutando = false;
  }
}

function iniciarProgramadorCitas() {
  if (intervalo) return;
  revisarCitasVencidas();
  intervalo = setInterval(revisarCitasVencidas, INTERVALO_MS);
  if (typeof intervalo.unref === 'function') intervalo.unref();
}

module.exports = { iniciarProgramadorCitas, revisarCitasVencidas };
