const db = require('../config/db');

async function listar() {
  const [rows] = await db.query(
    `SELECT id_servicio, nombre, precio, descripcion FROM servicios ORDER BY nombre`
  );
  return rows;
}

async function obtenerPorId(id_servicio) {
  const [rows] = await db.query(
    `SELECT id_servicio, nombre, precio, descripcion FROM servicios WHERE id_servicio = ?`,
    [id_servicio]
  );
  return rows[0];
}

async function crear({ nombre, precio, descripcion }) {
  const [resultado] = await db.query(
    `INSERT INTO servicios (nombre, precio, descripcion) VALUES (?, ?, ?)`,
    [nombre, precio, descripcion || null]
  );
  return resultado.insertId;
}

async function actualizar(id_servicio, { nombre, precio, descripcion }) {
  await db.query(
    `UPDATE servicios SET nombre = ?, precio = ?, descripcion = ? WHERE id_servicio = ?`,
    [nombre, precio, descripcion || null, id_servicio]
  );
}

async function eliminar(id_servicio) {
  const [usos] = await db.query(
    `SELECT id_detalle FROM detalle_cuenta WHERE id_servicio = ? LIMIT 1`,
    [id_servicio]
  );

  if (usos.length > 0) {
    const error = new Error('No se puede eliminar: este servicio ya fue usado en una o más ventas');
    error.codigoNegocio = 'EN_USO';
    throw error;
  }

  await db.query(`DELETE FROM servicios WHERE id_servicio = ?`, [id_servicio]);
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };