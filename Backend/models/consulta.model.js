const db = require('../config/db');
const { registrarVentaHistoria } = require('../utils/ventaHistoria');

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

function cantidadValida(valor) {
  const cantidad = Number(valor);
  return valor !== null && valor !== undefined && valor !== '' && Number.isFinite(cantidad) && cantidad > 0;
}

// CU08: registra la consulta, descuenta los productos utilizados y genera su venta en la misma transacción.
async function crear({ id_paciente, id_veterinario, id_cita, motivo_consulta, sintomas, signos_vitales,
  peso, diagnostico, procedimientos_realizados, observaciones, tratamientos, servicios_cobrables }) {
  const conexion = await db.getConnection();

  try {
    await conexion.beginTransaction();

    const [pacientes] = await conexion.query(
      `SELECT id_propietario FROM pacientes WHERE id_paciente = ? FOR UPDATE`,
      [id_paciente]
    );

    if (pacientes.length === 0) {
      const error = new Error('El paciente indicado no existe');
      error.codigoNegocio = 'PACIENTE_NO_EXISTE';
      throw error;
    }

    const id_propietario = pacientes[0].id_propietario;
    let id_historia = await obtenerIdHistoriaPorPaciente(id_paciente, conexion);

    // Si por alguna razón no tiene historia clínica, se crea aquí mismo.
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
    const itemsFacturacion = [];

    // Validamos y bloqueamos la cita para guardar su estado con la consulta.
    if (id_cita) {
      const [citas] = await conexion.query(
        `SELECT id_cita, id_paciente, estado FROM citas WHERE id_cita = ? FOR UPDATE`,
        [id_cita]
      );
      if (!citas.length || Number(citas[0].id_paciente) !== Number(id_paciente)) {
        const error = new Error('La cita indicada no existe o no corresponde al paciente');
        error.codigoNegocio = 'CITA_NO_VALIDA';
        throw error;
      }
      if (!['programada', 'en_atencion'].includes(citas[0].estado)) {
        const error = new Error('La cita no está disponible para registrar una consulta');
        error.codigoNegocio = 'CITA_NO_DISPONIBLE';
        throw error;
      }
      await conexion.query(`UPDATE citas SET estado = 'atendida' WHERE id_cita = ?`, [id_cita]);
      await conexion.query(
        `INSERT INTO auditoria_citas (id_cita, id_usuario, accion, estado_anterior, estado_nuevo, detalle)
         VALUES (?, ?, 'consulta_finalizada', ?, 'atendida', 'Consulta clínica guardada')`,
        [id_cita, id_veterinario, citas[0].estado]
      );
    }

    // Cada tratamiento queda en la historia. Los medicamentos del inventario se cobran al precio del catálogo.
    for (const t of (Array.isArray(tratamientos) ? tratamientos : [])) {
      let producto = null;
      let cantidadProducto = null;

      if (t.id_producto) {
        if (!cantidadValida(t.cantidad)) {
          const error = new Error('Indica una cantidad mayor que cero para cada producto formulado');
          error.codigoNegocio = 'CANTIDAD_INVALIDA';
          throw error;
        }

        cantidadProducto = Number(t.cantidad);
        const [productos] = await conexion.query(
          `SELECT id_producto, nombre, precio, costo_promedio, cantidad_disponible
           FROM productos WHERE id_producto = ? AND estado = 'activo' FOR UPDATE`,
          [t.id_producto]
        );

        if (productos.length === 0) {
          const error = new Error(`El producto con id ${t.id_producto} no está registrado en el inventario`);
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

      await conexion.query(
        `INSERT INTO tratamientos (id_consulta, id_producto, nombre_medicamento, cantidad, dosis, indicaciones)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id_consulta, t.id_producto || null, t.nombre_medicamento || null,
          t.cantidad !== '' && t.cantidad !== undefined ? t.cantidad : null,
          t.dosis || null, t.indicaciones || null]
      );

      if (producto && cantidadProducto !== null) {
        await conexion.query(
          `INSERT INTO movimientos_inventario (id_producto, tipo, motivo, cantidad, id_usuario, id_consulta)
           VALUES (?, 'salida', 'consulta', ?, ?, ?)`,
          [producto.id_producto, cantidadProducto, id_veterinario, id_consulta]
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
    }

    // Los procedimientos escritos como texto clínico se conservan como nota.
    // Para cobrar un procedimiento se selecciona explícitamente un servicio del catálogo.
    for (const s of (Array.isArray(servicios_cobrables) ? servicios_cobrables : [])) {
      if (!s.id_servicio) continue;

      if (!cantidadValida(s.cantidad)) {
        const error = new Error('Indica una cantidad mayor que cero para cada servicio realizado');
        error.codigoNegocio = 'CANTIDAD_INVALIDA';
        throw error;
      }

      const [servicios] = await conexion.query(
        `SELECT id_servicio, nombre, precio FROM servicios WHERE id_servicio = ? FOR UPDATE`,
        [s.id_servicio]
      );

      if (servicios.length === 0) {
        const error = new Error('Uno de los servicios seleccionados no existe en el catálogo');
        error.codigoNegocio = 'SERVICIO_NO_EXISTE';
        throw error;
      }

      itemsFacturacion.push({
        tipo: 'servicio',
        id_servicio: servicios[0].id_servicio,
        cantidad: Number(s.cantidad),
        precio_unitario: Number(servicios[0].precio),
        costo_unitario: null
      });
    }

    // La venta y sus detalles se guardan en la misma transacción de la consulta.
    // Si falla la facturación, también se revierten la consulta y los movimientos de inventario.
    const venta = await registrarVentaHistoria({
      conexion,
      id_propietario,
      id_paciente,
      id_usuario: id_veterinario,
      items: itemsFacturacion
    });

    await conexion.commit();
    return { id_consulta, ...venta };

  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

module.exports = { listarPorPaciente, obtenerPorId, crear, obtenerIdHistoriaPorPaciente };