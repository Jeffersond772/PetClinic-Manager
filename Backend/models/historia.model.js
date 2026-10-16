const db = require('../config/db');
const { registrarVentaHistoria } = require('../utils/ventaHistoria');

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

// CU15: registra vacuna/desparasitación/procedimiento y factura producto/servicio en la misma transacción.
async function registrarProcedimientoPreventivo({
  id_paciente, tipo, id_producto, cantidad, id_servicio, id_veterinario, fecha, observaciones
}) {
  const conexion = await db.getConnection();

  try {
    await conexion.beginTransaction();

    const [historias] = await conexion.query(
      `SELECT h.id_historia, p.id_propietario
       FROM historias_clinicas h
       JOIN pacientes p ON p.id_paciente = h.id_paciente
       WHERE h.id_paciente = ? FOR UPDATE`,
      [id_paciente]
    );

    if (historias.length === 0) {
      const error = new Error('El paciente no tiene historia clínica registrada');
      error.codigoNegocio = 'SIN_HISTORIA';
      throw error;
    }

    const { id_historia, id_propietario } = historias[0];
    const itemsFacturacion = [];
    let producto = null;
    const cantidadProducto = id_producto ? Number(cantidad) : null;

    if (id_producto) {
      if (cantidad === null || cantidad === undefined || cantidad === '' || !Number.isFinite(cantidadProducto) || cantidadProducto <= 0) {
        const error = new Error('Indica una cantidad mayor que cero para el producto aplicado');
        error.codigoNegocio = 'CANTIDAD_INVALIDA';
        throw error;
      }

      const [productos] = await conexion.query(
        `SELECT id_producto, nombre, precio, costo_promedio, cantidad_disponible
         FROM productos WHERE id_producto = ? AND estado = 'activo' FOR UPDATE`,
        [id_producto]
      );

      if (productos.length === 0) {
        const error = new Error('El producto indicado no está registrado en el inventario');
        error.codigoNegocio = 'PRODUCTO_NO_EXISTE';
        throw error;
      }

      producto = productos[0];
      if (Number(producto.cantidad_disponible) < cantidadProducto) {
        const error = new Error(`Stock insuficiente para "${producto.nombre}"`);
        error.codigoNegocio = 'STOCK_INSUFICIENTE';
        throw error;
      }
    }

    let servicio = null;
    if (id_servicio) {
      const [servicios] = await conexion.query(
        `SELECT id_servicio, nombre, precio FROM servicios WHERE id_servicio = ? FOR UPDATE`,
        [id_servicio]
      );

      if (servicios.length === 0) {
        const error = new Error('El servicio seleccionado no existe en el catálogo');
        error.codigoNegocio = 'SERVICIO_NO_EXISTE';
        throw error;
      }
      servicio = servicios[0];
    }

    const [resultado] = await conexion.query(
      `INSERT INTO procedimientos_preventivos (id_historia, tipo, id_producto, cantidad, id_veterinario, fecha, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id_historia, tipo, id_producto || null, id_producto ? cantidadProducto : (cantidad || null), id_veterinario, fecha, observaciones || null]
    );

    // El producto aplicado se descuenta una sola vez aquí. El registro de venta no vuelve a tocar el stock.
    if (producto) {
      await conexion.query(
        `INSERT INTO movimientos_inventario (id_producto, tipo, motivo, cantidad, id_usuario)
         VALUES (?, 'salida', 'consulta', ?, ?)`,
        [producto.id_producto, cantidadProducto, id_veterinario]
      );

      await conexion.query(
        `UPDATE productos SET cantidad_disponible = cantidad_disponible - ? WHERE id_producto = ?`,
        [cantidadProducto, producto.id_producto]
      );

      itemsFacturacion.push({
        tipo: 'producto',
        id_producto: producto.id_producto,
        cantidad: cantidadProducto,
        precio_unitario: Number(producto.precio),
        costo_unitario: Number(producto.costo_promedio)
      });
    }

    // Si también se seleccionó el servicio (p. ej. aplicación de vacuna), se factura como una unidad.
    if (servicio) {
      itemsFacturacion.push({
        tipo: 'servicio',
        id_servicio: servicio.id_servicio,
        cantidad: 1,
        precio_unitario: Number(servicio.precio),
        costo_unitario: null
      });
    }

    const venta = await registrarVentaHistoria({
      conexion,
      id_propietario,
      id_paciente,
      id_usuario: id_veterinario,
      items: itemsFacturacion
    });

    await conexion.commit();
    return { id_procedimiento: resultado.insertId, ...venta };

  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}
module.exports = { obtenerPorPaciente, registrarProcedimientoPreventivo };