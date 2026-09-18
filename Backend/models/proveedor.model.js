const db = require('../config/db');

async function listar() {
  const [rows] = await db.query(
    `SELECT id_proveedor, nombre, contacto, telefono, correo, direccion FROM proveedores ORDER BY nombre`
  );
  return rows;
}

async function obtenerPorId(id_proveedor) {
  const [rows] = await db.query(
    `SELECT id_proveedor, nombre, contacto, telefono, correo, direccion FROM proveedores WHERE id_proveedor = ?`,
    [id_proveedor]
  );
  return rows[0];
}

async function crear({ nombre, contacto, telefono, correo, direccion }) {
  const [resultado] = await db.query(
    `INSERT INTO proveedores (nombre, contacto, telefono, correo, direccion) VALUES (?, ?, ?, ?, ?)`,
    [nombre, contacto || null, telefono || null, correo || null, direccion || null]
  );
  return resultado.insertId;
}

async function actualizar(id_proveedor, { nombre, contacto, telefono, correo, direccion }) {
  await db.query(
    `UPDATE proveedores SET nombre = ?, contacto = ?, telefono = ?, correo = ?, direccion = ? WHERE id_proveedor = ?`,
    [nombre, contacto || null, telefono || null, correo || null, direccion || null, id_proveedor]
  );
}

module.exports = { listar, obtenerPorId, crear, actualizar };