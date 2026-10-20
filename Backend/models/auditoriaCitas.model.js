const db = require('../config/db');

async function registrar({ id_cita, id_usuario, accion, estado_anterior = null, estado_nuevo = null, detalle = null }) {
  await db.query(
    `INSERT INTO auditoria_citas (id_cita, id_usuario, accion, estado_anterior, estado_nuevo, detalle)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id_cita || null, id_usuario || null, accion, estado_anterior, estado_nuevo, detalle]
  );
}

async function listar(desde, hasta) {
  const [rows] = await db.query(
    `SELECT a.id_auditoria, a.id_cita, a.accion, a.estado_anterior, a.estado_nuevo,
            a.detalle, a.fecha_evento, u.nombre AS usuario
     FROM auditoria_citas a LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario
     WHERE DATE(a.fecha_evento) BETWEEN ? AND ? ORDER BY a.fecha_evento DESC LIMIT 500`,
    [desde, hasta]
  );
  return rows;
}

module.exports = { registrar, listar };