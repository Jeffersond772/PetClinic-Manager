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

module.exports = { listar, obtenerPorId, crear, actualizar };