const db = require('../config/db');

async function listar() {
  const [rows] = await db.query(
    `SELECT c.id_cita, c.fecha, c.hora, c.duracion_minutos, c.motivo, c.estado,
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
    SELECT c.id_cita, c.fecha, c.hora, c.duracion_minutos, c.motivo, c.estado,
           p.id_paciente, p.nombre AS paciente, pr.nombre AS propietario,
           u.id_usuario AS id_veterinario, u.nombre AS veterinario,
           co.id_consulta
    FROM citas c
    JOIN pacientes p ON p.id_paciente = c.id_paciente
    JOIN propietarios pr ON pr.id_propietario = c.id_propietario
    JOIN usuarios u ON u.id_usuario = c.id_veterinario
    LEFT JOIN consultas co ON co.id_cita = c.id_cita
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

// RF8: verificar si el veterinario ya tiene una cita cerca de ese horario
// (evita agendar dos citas demasiado seguidas, no solo a la misma hora exacta)
async function existeConflictoHorario(id_veterinario, fecha, hora, id_cita_excluir, duracionMinutos = 30) {

  let sql = `
    SELECT id_cita FROM citas
    WHERE id_veterinario = ? AND fecha = ?
      AND estado IN ('programada', 'en_atencion')
      AND TIME_TO_SEC(hora) < TIME_TO_SEC(?) + ? * 60
      AND TIME_TO_SEC(hora) + COALESCE(duracion_minutos, 30) * 60 > TIME_TO_SEC(?)
  `;
  const parametros = [id_veterinario, fecha, hora, duracionMinutos, hora];

  if (id_cita_excluir) {
    sql += ` AND id_cita != ?`;
    parametros.push(id_cita_excluir);
  }

  const [rows] = await db.query(sql, parametros);
  return rows.length > 0;
}

// CU07: agendar cita
async function crear({ id_paciente, id_propietario, id_veterinario, fecha, hora, motivo, duracion_minutos = 30 }) {
  const [resultado] = await db.query(
    `INSERT INTO citas (id_paciente, id_propietario, id_veterinario, fecha, hora, motivo, duracion_minutos, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'programada')`,
    [id_paciente, id_propietario, id_veterinario, fecha, hora, motivo || null, duracion_minutos]
  );
  return resultado.insertId;
}

// CU12: modificar cita (fecha, hora, motivo)
async function actualizar(id_cita, { fecha, hora, motivo, id_veterinario, duracion_minutos = 30 }) {
  await db.query(
    `UPDATE citas SET fecha = ?, hora = ?, motivo = ?, id_veterinario = ?, duracion_minutos = ? WHERE id_cita = ?`,
    [fecha, hora, motivo || null, id_veterinario, duracion_minutos, id_cita]
  );
}

// CU12: cancelar / marcar atendida / no asistió
async function cambiarEstado(id_cita, estado) {
  await db.query(`UPDATE citas SET estado = ? WHERE id_cita = ?`, [estado, id_cita]);
}

// Cancela citas cuya hora programada venció hace una hora y que nunca iniciaron atención.
async function cancelarCitasVencidas(ahoraLocal) {
  const conexion = await db.getConnection();
  try {
    await conexion.beginTransaction();
    const [vencidas] = await conexion.query(
      `SELECT id_cita FROM citas WHERE estado = 'programada'
       AND TIMESTAMP(fecha, hora) <= DATE_SUB(?, INTERVAL 1 HOUR) FOR UPDATE`,
      [ahoraLocal]
    );
    if (vencidas.length) {
      await conexion.query(
        `UPDATE citas SET estado = 'cancelada' WHERE id_cita IN (${vencidas.map(() => '?').join(',')})`,
        vencidas.map(c => c.id_cita)
      );
      for (const cita of vencidas) {
        await conexion.query(
          `INSERT INTO auditoria_citas (id_cita, id_usuario, accion, estado_anterior, estado_nuevo, detalle)
           VALUES (?, NULL, 'cancelacion_automatica', 'programada', 'cancelada', 'Venció el plazo de una hora')`,
          [cita.id_cita]
        );
      }
    }
    await conexion.commit();
    return vencidas.length;
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

module.exports = {
  listar, obtenerPorId, listarPorRangoFecha, existeConflictoHorario,
  crear, actualizar, cambiarEstado, cancelarCitasVencidas
};