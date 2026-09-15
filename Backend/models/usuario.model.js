const db = require('../config/db');

// CU02: buscar usuario por correo (para el login)
async function obtenerPorCorreo(correo) {
  const [rows] = await db.query(
    `SELECT u.id_usuario, u.nombre, u.correo, u.password_hash, u.estado,
            r.id_rol, r.nombre AS rol
     FROM usuarios u
     JOIN roles r ON r.id_rol = u.id_rol
     WHERE u.correo = ?`,
    [correo]
  );
  return rows[0]; // undefined si no existe
}

// CU09: buscar usuario por id (para consultar detalle)
async function obtenerPorId(id_usuario) {
  const [rows] = await db.query(
    `SELECT u.id_usuario, u.nombre, u.correo, u.telefono, u.estado,
            u.fecha_creacion, r.id_rol, r.nombre AS rol
     FROM usuarios u
     JOIN roles r ON r.id_rol = u.id_rol
     WHERE u.id_usuario = ?`,
    [id_usuario]
  );
  return rows[0];
}

// CU09: listar todos los usuarios con su rol y estado
async function listarUsuarios() {
  const [rows] = await db.query(
    `SELECT u.id_usuario, u.nombre, u.correo, u.telefono, u.estado,
            u.fecha_creacion, r.nombre AS rol
     FROM usuarios u
     JOIN roles r ON r.id_rol = u.id_rol
     ORDER BY u.nombre`
  );
  return rows;
}

// CU01: crear un nuevo usuario
async function crearUsuario({ nombre, correo, telefono, password_hash, id_rol }) {
  const [resultado] = await db.query(
    `INSERT INTO usuarios (nombre, correo, telefono, password_hash, id_rol)
     VALUES (?, ?, ?, ?, ?)`,
    [nombre, correo, telefono, password_hash, id_rol]
  );
  return resultado.insertId;
}

// CU03: actualizar datos de un usuario existente
async function actualizarUsuario(id_usuario, { nombre, correo, telefono, id_rol }) {
  await db.query(
    `UPDATE usuarios
     SET nombre = ?, correo = ?, telefono = ?, id_rol = ?
     WHERE id_usuario = ?`,
    [nombre, correo, telefono, id_rol, id_usuario]
  );
}

// CU09: desactivar (no eliminar) un usuario
async function cambiarEstado(id_usuario, nuevoEstado) {
  await db.query(
    `UPDATE usuarios SET estado = ? WHERE id_usuario = ?`,
    [nuevoEstado, id_usuario]
  );
}

module.exports = {
  obtenerPorCorreo,
  obtenerPorId,
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  cambiarEstado
};