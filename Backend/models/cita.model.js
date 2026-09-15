const db = require('../config/db');

async function listar() {
  const [rows] = await db.query(
    `SELECT c.id_cita, c.fecha, c.hora, c.motivo, c.estado,
            p.id_paciente, p.nombre AS paciente,
            pr.id_propietario, pr.nombre AS propietario,
            u.id_usuario AS id_veterinario, u.nombre AS veterinario
     FROM citas c
     JOIN pacientes p ON p.id_paciente = c.id_paciente
     JOIN propietarios pr ON pr.id_propietario = c.id_propietario
     JOIN usuarios u ON u.id_usuario = c.id_veterinario
     ORDER BY c.fecha DESC, c.hora DESC`
  );
  return rows;
}

async function obtenerPorId(id_cita) {
  const [rows] = await db.query(
    `SELECT c.*, p.nombre AS paciente, pr.nombre AS propietario, u.nombre AS veterinario
     FROM citas c
     JOIN pacientes p ON p.id_paciente = c.id_paciente
     JOIN propietarios pr ON pr.id_propietario = c.id_propietario
     JOIN usuarios u ON u.id_usuario = c.id_veterinario
     WHERE c.id_cita = ?`,
    [id_cita]
  );
  return rows[0];
}

// CU13: agenda por rango de fechas (sirve para vista diaria, semanal o mensual según lo que mande el Frontend)
async function listarPorRangoFecha(fechaInicio, fechaFin, id_veterinario) {
  let sql = `
    SELECT c.id_cita, c.fecha, c.hora, c.motivo, c.estado,
           p.nombre AS paciente, pr.nombre AS propietario,
           u.id_usuario AS id_veterinario, u.nombre AS veterinario
    FROM citas c
    JOIN pacientes p ON p.id_paciente = c.id_paciente
    JOIN propietarios pr ON pr.id_propietario = c.id_propietario
    JOIN usuarios u ON u.id_usuario = c.id_veterinario
    WHERE c.fecha BETWEEN ? AND ?
  `;
  const parametros = [fechaInicio, fechaFin];

  if (id_veterinario) {
    sql += ` AND c.id_veterinario = ?`;
    parametros.push(id_veterinario);
  }

  sql += ` ORDER BY c.fecha, c.hora`;

  const [rows] = await db.query(sql, parametros);
  return rows;
}

// RF8: verificar si el veterinario ya tiene una cita activa en ese horario
async function existeConflictoHorario(id_veterinario, fecha, hora, id_cita_excluir) {
  let sql = `
    SELECT id_cita FROM citas
    WHERE id_veterinario = ? AND fecha = ? AND hora = ?
      AND estado IN ('programada', 'atendida')
  `;
  const parametros = [id_veterinario, fecha, hora];

  if (id_cita_excluir) {
    sql += ` AND id_cita != ?`;
    parametros.push(id_cita_excluir);
  }

  const [rows] = await db.query(sql, parametros);
  return rows.length > 0;
}

// CU07: agendar cita
async function crear({ id_paciente, id_propietario, id_veterinario, fecha, hora, motivo }) {
  const [resultado] = await db.query(
    `INSERT INTO citas (id_paciente, id_propietario, id_veterinario, fecha, hora, motivo, estado)
     VALUES (?, ?, ?, ?, ?, ?, 'programada')`,
    [id_paciente, id_propietario, id_veterinario, fecha, hora, motivo || null]
  );
  return resultado.insertId;
}

// CU12: modificar cita (fecha, hora, motivo)
async function actualizar(id_cita, { fecha, hora, motivo, id_veterinario }) {
  await db.query(
    `UPDATE citas SET fecha = ?, hora = ?, motivo = ?, id_veterinario = ? WHERE id_cita = ?`,
    [fecha, hora, motivo || null, id_veterinario, id_cita]
  );
}

// CU12: cancelar / marcar atendida / no asistió
async function cambiarEstado(id_cita, estado) {
  await db.query(`UPDATE citas SET estado = ? WHERE id_cita = ?`, [estado, id_cita]);
}

module.exports = {
  listar, obtenerPorId, listarPorRangoFecha, existeConflictoHorario,
  crear, actualizar, cambiarEstado
};