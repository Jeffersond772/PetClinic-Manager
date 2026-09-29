const db = require('../config/db');

async function crear({ id_cita, id_veterinario, tipo }) {
  const [resultado] = await db.query(
    `INSERT INTO notificaciones_cita (id_cita, id_veterinario, tipo) VALUES (?, ?, ?)`,
    [id_cita, id_veterinario, tipo]
  );
  return resultado.insertId;
}

async function listarPendientes() {
  const [rows] = await db.query(
    `SELECT id_notificacion, id_cita, id_veterinario, tipo, intentos
     FROM notificaciones_cita
     WHERE estado = 'pendiente'
     ORDER BY fecha_creacion`
  );
  return rows;
}

async function marcarEnviada(id_notificacion) {
  await db.query(
    `UPDATE notificaciones_cita SET estado = 'enviada', fecha_envio = NOW() WHERE id_notificacion = ?`,
    [id_notificacion]
  );
}

async function registrarFallo(id_notificacion, intentos) {
  const nuevoEstado = intentos >= 5 ? 'fallida' : 'pendiente';
  await db.query(
    `UPDATE notificaciones_cita SET estado = ?, intentos = ? WHERE id_notificacion = ?`,
    [nuevoEstado, intentos, id_notificacion]
  );
}

module.exports = { crear, listarPendientes, marcarEnviada, registrarFallo };