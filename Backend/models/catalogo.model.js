const db = require('../config/db');

async function listarEspecies() {
  const [rows] = await db.query(
    `SELECT id_especie, nombre FROM especies ORDER BY nombre`
  );
  return rows;
}

// Si se pasa id_especie, filtra razas de esa especie; si no, trae todas
async function listarRazas(id_especie) {
  if (id_especie) {
    const [rows] = await db.query(
      `SELECT id_raza, nombre, id_especie FROM razas WHERE id_especie = ? ORDER BY nombre`,
      [id_especie]
    );
    return rows;
  }

  const [rows] = await db.query(
    `SELECT id_raza, nombre, id_especie FROM razas ORDER BY nombre`
  );
  return rows;
}

async function listarRoles() {
  const [rows] = await db.query(
    `SELECT id_rol, nombre FROM roles ORDER BY id_rol`
  );
  return rows;
}

async function listarCategoriasProducto() {
  const [rows] = await db.query(
    `SELECT id_categoria, nombre FROM categorias_producto ORDER BY nombre`
  );
  return rows;
}
async function listarVeterinarios() {
  const [rows] = await db.query(
    `SELECT u.id_usuario, u.nombre, u.hora_inicio_laboral, u.hora_fin_laboral
     FROM usuarios u
     JOIN roles r ON r.id_rol = u.id_rol
     WHERE r.nombre = 'Veterinario' AND u.estado = 'activo'
     ORDER BY u.nombre`
  );
  return rows;
}

module.exports = { listarEspecies, listarRazas, listarRoles, listarCategoriasProducto, listarVeterinarios };