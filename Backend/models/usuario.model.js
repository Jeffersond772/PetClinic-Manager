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
            u.fecha_creacion, u.hora_inicio_laboral, u.hora_fin_laboral,
            r.id_rol, r.nombre AS rol
     FROM usuarios u
     JOIN roles r ON r.id_rol = u.id_rol
     WHERE u.id_usuario = ?`,
    [id_usuario]
  );
  return rows[0];
}

// Compara una hora (HH:MM) contra el horario laboral del veterinario.
// Si no tiene horario definido, se considera "dentro" (sin restricción).
async function estaDentroDeHorarioLaboral(id_usuario, hora) {
  const [rows] = await db.query(
    `SELECT hora_inicio_laboral, hora_fin_laboral,
            (hora_inicio_laboral IS NULL OR hora_fin_laboral IS NULL
             OR ? BETWEEN hora_inicio_laboral AND hora_fin_laboral) AS dentro
     FROM usuarios WHERE id_usuario = ?`,
    [hora, id_usuario]
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
async function crearUsuario({ nombre, correo, telefono, password_hash, id_rol, hora_inicio_laboral, hora_fin_laboral }) {
  const [resultado] = await db.query(
    `INSERT INTO usuarios (nombre, correo, telefono, password_hash, id_rol, hora_inicio_laboral, hora_fin_laboral)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [nombre, correo, telefono, password_hash, id_rol, hora_inicio_laboral || null, hora_fin_laboral || null]
  );
  return resultado.insertId;
}

// CU03: actualizar datos de un usuario existente
async function actualizarUsuario(id_usuario, { nombre, correo, telefono, id_rol, hora_inicio_laboral, hora_fin_laboral }) {
  await db.query(
    `UPDATE usuarios
     SET nombre = ?, correo = ?, telefono = ?, id_rol = ?, hora_inicio_laboral = ?, hora_fin_laboral = ?
     WHERE id_usuario = ?`,
    [nombre, correo, telefono, id_rol, hora_inicio_laboral || null, hora_fin_laboral || null, id_usuario]
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
  cambiarEstado,
  estaDentroDeHorarioLaboral
};