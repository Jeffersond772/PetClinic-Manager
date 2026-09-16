const db = require('../config/db');

async function listar() {
  const [rows] = await db.query(
    `SELECT g.id_gasto, g.concepto, g.categoria, g.monto, g.fecha, u.nombre AS registrado_por
     FROM gastos g
     JOIN usuarios u ON u.id_usuario = g.id_usuario
     ORDER BY g.fecha DESC`
  );
  return rows;
}

// CU18: consultar por rango de fechas (para el resumen financiero)
async function listarPorRangoFecha(fechaInicio, fechaFin) {
  const [rows] = await db.query(
    `SELECT id_gasto, concepto, categoria, monto, fecha
     FROM gastos
     WHERE fecha BETWEEN ? AND ?
     ORDER BY fecha DESC`,
    [fechaInicio, fechaFin]
  );
  return rows;
}

// CU17
async function crear({ concepto, categoria, monto, fecha, id_usuario }) {
  const [resultado] = await db.query(
    `INSERT INTO gastos (concepto, categoria, monto, fecha, id_usuario)
     VALUES (?, ?, ?, ?, ?)`,
    [concepto, categoria || null, monto, fecha, id_usuario]
  );
  return resultado.insertId;
}

module.exports = { listar, listarPorRangoFecha, crear };