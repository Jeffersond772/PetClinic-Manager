const db = require('../config/db');

// Busca el id_historia de un paciente (ya debería existir, se crea automático al registrar el paciente)
async function obtenerIdHistoriaPorPaciente(id_paciente, conexion) {
  const ejecutor = conexion || db;
  const [rows] = await ejecutor.query(
    `SELECT id_historia FROM historias_clinicas WHERE id_paciente = ?`,
    [id_paciente]
  );
  return rows[0]?.id_historia;
}

async function listarPorPaciente(id_paciente) {
  const [rows] = await db.query(
    `SELECT c.id_consulta, c.fecha, c.motivo_consulta, c.diagnostico, u.nombre AS veterinario
     FROM consultas c
     JOIN usuarios u ON u.id_usuario = c.id_veterinario
     WHERE c.id_paciente = ?
     ORDER BY c.fecha DESC`,
    [id_paciente]
  );
  return rows;
}

async function obtenerPorId(id_consulta) {
  const [consultas] = await db.query(
    `SELECT c.*, p.nombre AS paciente, u.nombre AS veterinario
     FROM consultas c
     JOIN pacientes p ON p.id_paciente = c.id_paciente
     JOIN usuarios u ON u.id_usuario = c.id_veterinario
     WHERE c.id_consulta = ?`,
    [id_consulta]
  );

  const consulta = consultas[0];
  if (!consulta) return null;

  const [tratamientos] = await db.query(
    `SELECT t.id_tratamiento, t.id_producto, t.nombre_medicamento, t.cantidad, t.dosis, t.indicaciones,
            pr.nombre AS producto
     FROM tratamientos t
     LEFT JOIN productos pr ON pr.id_producto = t.id_producto
     WHERE t.id_consulta = ?`,
    [id_consulta]
  );

  consulta.tratamientos = tratamientos;
  return consulta;
}

// CU08: registrar consulta completa (con tratamientos que descuentan inventario automáticamente)
async function crear({ id_paciente, id_veterinario, id_cita, motivo_consulta, sintomas, signos_vitales,
                       peso, diagnostico, procedimientos_realizados, observaciones, tratamientos }) {
  const conexion = await db.getConnection();

  try {
    await conexion.beginTransaction();

    let id_historia = await obtenerIdHistoriaPorPaciente(id_paciente, conexion);

    // Flujo alternativo CU08: si por alguna razón no tiene historia clínica, se crea aquí mismo
    if (!id_historia) {
      const [resultadoHistoria] = await conexion.query(
        `INSERT INTO historias_clinicas (id_paciente) VALUES (?)`,
        [id_paciente]
      );
      id_historia = resultadoHistoria.insertId;
    }

    const [resultadoConsulta] = await conexion.query(
      `INSERT INTO consultas
       (id_historia, id_cita, id_paciente, id_veterinario, motivo_consulta, sintomas, signos_vitales, peso, diagnostico, procedimientos_realizados, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id_historia, id_cita || null, id_paciente, id_veterinario, motivo_consulta || null, sintomas || null,
       signos_vitales || null, peso || null, diagnostico || null, procedimientos_realizados || null, observaciones || null]
    );

    const id_consulta = resultadoConsulta.insertId;

    // Si la consulta vino de una cita agendada, la marcamos como atendida
    if (id_cita) {
      await conexion.query(`UPDATE citas SET estado = 'atendida' WHERE id_cita = ?`, [id_cita]);
    }

    // Procesar cada tratamiento formulado
    for (const t of (tratamientos || [])) {
      await conexion.query(
        `INSERT INTO tratamientos (id_consulta, id_producto, nombre_medicamento, cantidad, dosis, indicaciones)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id_consulta, t.id_producto || null, t.nombre_medicamento || null, t.cantidad || null, t.dosis || null, t.indicaciones || null]
      );

      // RF3: si el tratamiento usa un producto del inventario y trae cantidad, se descuenta el stock
      if (t.id_producto && t.cantidad) {
        const [productos] = await conexion.query(
          `SELECT cantidad_disponible FROM productos WHERE id_producto = ? AND estado = 'activo' FOR UPDATE`,
          [t.id_producto]
        );

        if (productos.length === 0) {
          const error = new Error(`El producto con id ${t.id_producto} no está registrado en el inventario`);
          error.codigoNegocio = 'PRODUCTO_NO_EXISTE';
          throw error;
        }

        if (Number(productos[0].cantidad_disponible) < Number(t.cantidad)) {
          const error = new Error(`Stock insuficiente para el producto id ${t.id_producto}`);
          error.codigoNegocio = 'STOCK_INSUFICIENTE';
          throw error;
        }

        await conexion.query(
          `INSERT INTO movimientos_inventario (id_producto, tipo, motivo, cantidad, id_usuario, id_consulta)
           VALUES (?, 'salida', 'consulta', ?, ?, ?)`,
          [t.id_producto, t.cantidad, id_veterinario, id_consulta]
        );

        await conexion.query(
          `UPDATE productos SET cantidad_disponible = cantidad_disponible - ? WHERE id_producto = ?`,
          [t.cantidad, t.id_producto]
        );
      }
    }

    await conexion.commit();
    return id_consulta;

  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

module.exports = { listarPorPaciente, obtenerPorId, crear, obtenerIdHistoriaPorPaciente };