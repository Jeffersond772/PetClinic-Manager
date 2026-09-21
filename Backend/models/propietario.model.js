const db = require('../config/db');

async function listar(estado = 'activo') {
  const [rows] = await db.query(
    `SELECT id_propietario, nombre, telefono, correo, direccion, identificacion, fecha_registro, estado
     FROM propietarios
     WHERE estado = ?
     ORDER BY nombre`,
    [estado]
  );
  return rows;
}

async function buscar(termino, estado = 'activo') {
  const like = `%${termino}%`;
  const [rows] = await db.query(
    `SELECT id_propietario, nombre, telefono, correo, identificacion, estado
     FROM propietarios
     WHERE (nombre LIKE ? OR identificacion LIKE ?) AND estado = ?
     ORDER BY nombre
     LIMIT 20`,
    [like, like, estado]
  );
  return rows;
}

async function cambiarEstado(id_propietario, estado) {
  await db.query(
    `UPDATE propietarios SET estado = ? WHERE id_propietario = ?`,
    [estado, id_propietario]
  );
}

async function obtenerPorId(id_propietario) {
  const [rows] = await db.query(
    `SELECT id_propietario, nombre, telefono, correo, direccion, identificacion, fecha_registro
     FROM propietarios
     WHERE id_propietario = ?`,
    [id_propietario]
  );
  return rows[0];
}


async function crear({ nombre, telefono, correo, direccion, identificacion }) {
  const [resultado] = await db.query(
    `INSERT INTO propietarios (nombre, telefono, correo, direccion, identificacion)
     VALUES (?, ?, ?, ?, ?)`,
    [nombre, telefono, correo, direccion, identificacion]
  );
  return resultado.insertId;
}

async function actualizar(id_propietario, { nombre, telefono, correo, direccion, identificacion }) {
  await db.query(
    `UPDATE propietarios
     SET nombre = ?, telefono = ?, correo = ?, direccion = ?, identificacion = ?
     WHERE id_propietario = ?`,
    [nombre, telefono, correo, direccion, identificacion, id_propietario]
  );
}

module.exports = { listar, obtenerPorId, buscar, crear, actualizar, cambiarEstado };