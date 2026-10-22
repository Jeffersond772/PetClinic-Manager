const db = require('../config/db');

// Marca la cita como atendida cuando se registra una atención (consulta o procedimiento) ligada a ella
async function cerrarCitaPorAtencion(id_cita, id_paciente) {
  if (!id_cita) return;
  await db.query(
    `UPDATE citas SET estado = 'atendida'
     WHERE id_cita = ? AND id_paciente = ? AND estado IN ('programada', 'en_atencion')`,
    [id_cita, id_paciente]
  );
}

module.exports = { cerrarCitaPorAtencion };