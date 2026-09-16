const db = require('../config/db');

// CU14: historia clínica completa de un paciente
async function obtenerPorPaciente(id_paciente) {
  // Datos generales del paciente y su propietario
  const [pacientes] = await db.query(
    `SELECT p.id_paciente, p.nombre, p.sexo, p.fecha_nacimiento, p.peso,
            e.nombre AS especie, r.nombre AS raza,
            pr.nombre AS propietario, pr.telefono AS telefono_propietario
     FROM pacientes p
     JOIN especies e ON e.id_especie = p.id_especie
     LEFT JOIN razas r ON r.id_raza = p.id_raza
     JOIN propietarios pr ON pr.id_propietario = p.id_propietario
     WHERE p.id_paciente = ?`,
    [id_paciente]
  );

  const paciente = pacientes[0];
  if (!paciente) return null;

  // Todas las consultas anteriores, con sus tratamientos
  const [consultas] = await db.query(
    `SELECT c.id_consulta, c.fecha, c.motivo_consulta, c.sintomas, c.signos_vitales,
            c.peso, c.diagnostico, c.procedimientos_realizados, c.observaciones,
            u.nombre AS veterinario
     FROM consultas c
     JOIN usuarios u ON u.id_usuario = c.id_veterinario
     WHERE c.id_paciente = ?
     ORDER BY c.fecha DESC`,
    [id_paciente]
  );

  for (const consulta of consultas) {
    const [tratamientos] = await db.query(
      `SELECT t.nombre_medicamento, t.cantidad, t.dosis, t.indicaciones, pr.nombre AS producto
       FROM tratamientos t
       LEFT JOIN productos pr ON pr.id_producto = t.id_producto
       WHERE t.id_consulta = ?`,
      [consulta.id_consulta]
    );
    consulta.tratamientos = tratamientos;
  }

  // CU15: vacunas, desparasitaciones y otros procedimientos preventivos
  const [procedimientos] = await db.query(
    `SELECT pp.id_procedimiento, pp.tipo, pp.cantidad, pp.fecha, pp.observaciones,
            u.nombre AS veterinario, pr.nombre AS producto
     FROM procedimientos_preventivos pp
     JOIN historias_clinicas h ON h.id_historia = pp.id_historia
     JOIN usuarios u ON u.id_usuario = pp.id_veterinario
     LEFT JOIN productos pr ON pr.id_producto = pp.id_producto
     WHERE h.id_paciente = ?
     ORDER BY pp.fecha DESC`,
    [id_paciente]
  );

  return { paciente, consultas, procedimientos };
}

// CU15: registrar vacuna, desparasitación u otro procedimiento preventivo
async function registrarProcedimientoPreventivo({ id_paciente, tipo, id_producto, cantidad, id_veterinario, fecha, observaciones }) {
  const conexion = await db.getConnection();

  try {
    await conexion.beginTransaction();

    const [historias] = await conexion.query(
      `SELECT id_historia FROM historias_clinicas WHERE id_paciente = ?`,
      [id_paciente]
    );

    if (historias.length === 0) {
      const error = new Error('El paciente no tiene historia clínica registrada');
      error.codigoNegocio = 'SIN_HISTORIA';
      throw error;
    }

    const id_historia = historias[0].id_historia;

    const [resultado] = await conexion.query(
      `INSERT INTO procedimientos_preventivos (id_historia, tipo, id_producto, cantidad, id_veterinario, fecha, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id_historia, tipo, id_producto || null, cantidad || null, id_veterinario, fecha, observaciones || null]
    );

    // Si se usó un producto del inventario (ej. una vacuna), se descuenta el stock
    if (id_producto && cantidad) {
      const [productos] = await conexion.query(
        `SELECT cantidad_disponible FROM productos WHERE id_producto = ? AND estado = 'activo' FOR UPDATE`,
        [id_producto]
      );

      if (productos.length === 0) {
        const error = new Error('El producto indicado no está registrado en el inventario');
        error.codigoNegocio = 'PRODUCTO_NO_EXISTE';
        throw error;
      }

      if (Number(productos[0].cantidad_disponible) < Number(cantidad)) {
        const error = new Error('Stock insuficiente para el producto indicado');
        error.codigoNegocio = 'STOCK_INSUFICIENTE';
        throw error;
      }

      await conexion.query(
        `INSERT INTO movimientos_inventario (id_producto, tipo, motivo, cantidad, id_usuario)
         VALUES (?, 'salida', 'consulta', ?, ?)`,
        [id_producto, cantidad, id_veterinario]
      );

      await conexion.query(
        `UPDATE productos SET cantidad_disponible = cantidad_disponible - ? WHERE id_producto = ?`,
        [cantidad, id_producto]
      );
    }

    await conexion.commit();
    return resultado.insertId;

  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

module.exports = { obtenerPorPaciente, registrarProcedimientoPreventivo };