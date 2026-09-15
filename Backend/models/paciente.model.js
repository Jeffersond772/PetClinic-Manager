const db = require('../config/db');

async function listar() {
  const [rows] = await db.query(
    `SELECT p.id_paciente, p.nombre, p.sexo, p.fecha_nacimiento, p.peso,
            e.nombre AS especie, r.nombre AS raza,
            pr.id_propietario, pr.nombre AS propietario
     FROM pacientes p
     JOIN especies e ON e.id_especie = p.id_especie
     LEFT JOIN razas r ON r.id_raza = p.id_raza
     JOIN propietarios pr ON pr.id_propietario = p.id_propietario
     ORDER BY p.nombre`
  );
  return rows;
}

async function obtenerPorId(id_paciente) {
  const [rows] = await db.query(
    `SELECT p.id_paciente, p.nombre, p.sexo, p.fecha_nacimiento, p.peso, p.caracteristicas,
            p.id_especie, e.nombre AS especie,
            p.id_raza, r.nombre AS raza,
            p.id_propietario, pr.nombre AS propietario, pr.telefono AS telefono_propietario
     FROM pacientes p
     JOIN especies e ON e.id_especie = p.id_especie
     LEFT JOIN razas r ON r.id_raza = p.id_raza
     JOIN propietarios pr ON pr.id_propietario = p.id_propietario
     WHERE p.id_paciente = ?`,
    [id_paciente]
  );
  return rows[0];
}

// CU14: buscar pacientes por nombre, propietario o identificación del propietario
async function buscar(termino) {
  const like = `%${termino}%`;
  const [rows] = await db.query(
    `SELECT p.id_paciente, p.nombre, e.nombre AS especie,
            pr.id_propietario, pr.nombre AS propietario
     FROM pacientes p
     JOIN especies e ON e.id_especie = p.id_especie
     JOIN propietarios pr ON pr.id_propietario = p.id_propietario
     WHERE p.nombre LIKE ? OR pr.nombre LIKE ? OR pr.identificacion LIKE ?
     ORDER BY p.nombre
     LIMIT 20`,
    [like, like, like]
  );
  return rows;
}

// Todos los pacientes de un propietario específico (útil en su ficha)
async function listarPorPropietario(id_propietario) {
  const [rows] = await db.query(
    `SELECT p.id_paciente, p.nombre, e.nombre AS especie, r.nombre AS raza, p.fecha_nacimiento
     FROM pacientes p
     JOIN especies e ON e.id_especie = p.id_especie
     LEFT JOIN razas r ON r.id_raza = p.id_raza
     WHERE p.id_propietario = ?
     ORDER BY p.nombre`,
    [id_propietario]
  );
  return rows;
}

async function crear({ nombre, id_especie, id_raza, sexo, fecha_nacimiento, peso, caracteristicas, id_propietario }) {
  const [resultado] = await db.query(
    `INSERT INTO pacientes (nombre, id_especie, id_raza, sexo, fecha_nacimiento, peso, caracteristicas, id_propietario)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [nombre, id_especie, id_raza || null, sexo || 'desconocido', fecha_nacimiento || null, peso || null, caracteristicas || null, id_propietario]
  );

  // CU08 (flujo alternativo): si el paciente no tiene historia clínica, se crea automáticamente
  await db.query(
    `INSERT INTO historias_clinicas (id_paciente) VALUES (?)`,
    [resultado.insertId]
  );

  return resultado.insertId;
}

async function actualizar(id_paciente, { nombre, id_especie, id_raza, sexo, fecha_nacimiento, peso, caracteristicas }) {
  await db.query(
    `UPDATE pacientes
     SET nombre = ?, id_especie = ?, id_raza = ?, sexo = ?, fecha_nacimiento = ?, peso = ?, caracteristicas = ?
     WHERE id_paciente = ?`,
    [nombre, id_especie, id_raza || null, sexo, fecha_nacimiento || null, peso || null, caracteristicas || null, id_paciente]
  );
}

module.exports = { listar, obtenerPorId, buscar, listarPorPropietario, crear, actualizar };