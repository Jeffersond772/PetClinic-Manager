const db = require('../config/db');

async function listar() {
  const [rows] = await db.query(
    `SELECT id_propietario, nombre, telefono, correo, direccion, identificacion, fecha_registro
     FROM propietarios
     ORDER BY nombre`
  );
  return rows;
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

// Búsqueda por nombre o identificación (para el buscador de pacientes/propietarios)
async function buscar(termino) {
  const like = `%${termino}%`;
  const [rows] = await db.query(
    `SELECT id_propietario, nombre, telefono, correo, identificacion
     FROM propietarios
     WHERE nombre LIKE ? OR identificacion LIKE ?
     ORDER BY nombre
     LIMIT 20`,
    [like, like]
  );
  return rows;
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

module.exports = { listar, obtenerPorId, buscar, crear, actualizar };