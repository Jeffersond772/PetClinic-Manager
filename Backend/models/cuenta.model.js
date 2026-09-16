const db = require('../config/db');

async function listar() {
  const [rows] = await db.query(
    `SELECT c.id_cuenta, c.fecha, c.subtotal, c.total, c.estado,
            pr.id_propietario, pr.nombre AS propietario,
            u.nombre AS registrado_por,
            COALESCE((SELECT SUM(monto) FROM pagos WHERE id_cuenta = c.id_cuenta), 0) AS total_pagado
     FROM cuentas c
     JOIN propietarios pr ON pr.id_propietario = c.id_propietario
     JOIN usuarios u ON u.id_usuario = c.id_usuario
     ORDER BY c.fecha DESC`
  );
  return rows;
}

async function obtenerPorId(id_cuenta) {
  const [cuentas] = await db.query(
    `SELECT c.*, pr.nombre AS propietario, u.nombre AS registrado_por
     FROM cuentas c
     JOIN propietarios pr ON pr.id_propietario = c.id_propietario
     JOIN usuarios u ON u.id_usuario = c.id_usuario
     WHERE c.id_cuenta = ?`,
    [id_cuenta]
  );

  const cuenta = cuentas[0];
  if (!cuenta) return null;

    const [detalle] = await db.query(
    `SELECT dc.id_detalle, dc.tipo, dc.cantidad, dc.precio_unitario, dc.costo_unitario, dc.subtotal,
            p.nombre AS producto, s.nombre AS servicio,
            CASE WHEN dc.tipo = 'producto' AND dc.precio_unitario > 0
                 THEN ROUND(((dc.precio_unitario - dc.costo_unitario) / dc.precio_unitario) * 100, 1)
                 ELSE NULL END AS margen_porcentaje
     FROM detalle_cuenta dc
     LEFT JOIN productos p ON p.id_producto = dc.id_producto
     LEFT JOIN servicios s ON s.id_servicio = dc.id_servicio
     WHERE dc.id_cuenta = ?`,
    [id_cuenta]
  );

  const [pagos] = await db.query(
    `SELECT id_pago, fecha, monto, metodo_pago FROM pagos WHERE id_cuenta = ? ORDER BY fecha`,
    [id_cuenta]
  );

  cuenta.detalle = detalle;
  cuenta.pagos = pagos;
  return cuenta;
}

// CU16: crear cuenta con sus ítems (productos y/o servicios), descontando inventario si aplica
async function crear({ id_propietario, id_paciente, id_usuario, items }) {
  const conexion = await db.getConnection();

  try {
    await conexion.beginTransaction();

    let subtotal = 0;
    const itemsValidados = [];

    for (const item of items) {
      let precio_unitario;
      let nombreParaValidar;

            if (item.tipo === 'producto') {
        const [productos] = await conexion.query(
          `SELECT precio, costo_promedio, cantidad_disponible, nombre FROM productos WHERE id_producto = ? AND estado = 'activo' FOR UPDATE`,
          [item.id_producto]
        );
        if (productos.length === 0) {
          const error = new Error(`El producto seleccionado no existe`);
          error.codigoNegocio = 'ITEM_NO_EXISTE';
          throw error;
        }
        if (Number(productos[0].cantidad_disponible) < Number(item.cantidad)) {
          const error = new Error(`Stock insuficiente para "${productos[0].nombre}"`);
          error.codigoNegocio = 'STOCK_INSUFICIENTE';
          throw error;
        }
        precio_unitario = productos[0].precio;
        item.costo_unitario = productos[0].costo_promedio; // se congela el costo de este momento
      } else {
        const [servicios] = await conexion.query(
          `SELECT precio, nombre FROM servicios WHERE id_servicio = ?`,
          [item.id_servicio]
        );
        if (servicios.length === 0) {
          const error = new Error(`El servicio seleccionado no existe`);
          error.codigoNegocio = 'ITEM_NO_EXISTE';
          throw error;
        }
        precio_unitario = servicios[0].precio;
      }

      const subtotalItem = Number(precio_unitario) * Number(item.cantidad);
      subtotal += subtotalItem;

      itemsValidados.push({ ...item, precio_unitario, subtotal: subtotalItem });
    }

    const total = subtotal; // aquí es donde en el futuro se podrían sumar impuestos o descuentos

    const [resultadoCuenta] = await conexion.query(
      `INSERT INTO cuentas (id_propietario, id_paciente, id_usuario, subtotal, total, estado)
       VALUES (?, ?, ?, ?, ?, 'pendiente')`,
      [id_propietario, id_paciente || null, id_usuario, subtotal, total]
    );

    const id_cuenta = resultadoCuenta.insertId;

    for (const item of itemsValidados) {
            await conexion.query(
        `INSERT INTO detalle_cuenta (id_cuenta, tipo, id_producto, id_servicio, cantidad, precio_unitario, costo_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id_cuenta, item.tipo, item.tipo === 'producto' ? item.id_producto : null,
         item.tipo === 'servicio' ? item.id_servicio : null, item.cantidad, item.precio_unitario,
         item.tipo === 'producto' ? item.costo_unitario : null, item.subtotal]
      );

      // Si es producto, se descuenta del inventario (RF3 aplicado también a ventas directas)
      if (item.tipo === 'producto') {
        await conexion.query(
          `INSERT INTO movimientos_inventario (id_producto, tipo, motivo, cantidad, id_usuario)
           VALUES (?, 'salida', 'venta', ?, ?)`,
          [item.id_producto, item.cantidad, id_usuario]
        );
        await conexion.query(
          `UPDATE productos SET cantidad_disponible = cantidad_disponible - ? WHERE id_producto = ?`,
          [item.cantidad, item.id_producto]
        );
      }
    }

    await conexion.commit();
    return { id_cuenta, total };

  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

// CU16: registrar un pago (completo o parcial) y actualizar el estado de la cuenta
async function registrarPago({ id_cuenta, monto, metodo_pago, id_usuario }) {
  const conexion = await db.getConnection();

  try {
    await conexion.beginTransaction();

    const [cuentas] = await conexion.query(
      `SELECT total FROM cuentas WHERE id_cuenta = ? FOR UPDATE`,
      [id_cuenta]
    );

    if (cuentas.length === 0) {
      const error = new Error('La cuenta indicada no existe');
      error.codigoNegocio = 'CUENTA_NO_EXISTE';
      throw error;
    }

    const total = Number(cuentas[0].total);

    const [resultadoPago] = await conexion.query(
      `INSERT INTO pagos (id_cuenta, monto, metodo_pago) VALUES (?, ?, ?)`,
      [id_cuenta, monto, metodo_pago]
    );

    const [sumaPagos] = await conexion.query(
      `SELECT COALESCE(SUM(monto), 0) AS total_pagado FROM pagos WHERE id_cuenta = ?`,
      [id_cuenta]
    );

    const totalPagado = Number(sumaPagos[0].total_pagado);

    // Flujo alternativo CU16: si el pago es parcial, queda como deuda; si cubre el total, se marca pagada
    const nuevoEstado = totalPagado >= total ? 'pagada' : 'parcial';

    await conexion.query(`UPDATE cuentas SET estado = ? WHERE id_cuenta = ?`, [nuevoEstado, id_cuenta]);

    await conexion.commit();
    return { id_pago: resultadoPago.insertId, estado: nuevoEstado, saldoPendiente: Math.max(total - totalPagado, 0) };

  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

// CU18: deudas / saldos pendientes por propietario
async function listarDeudas() {
  const [rows] = await db.query(
    `SELECT c.id_propietario, pr.nombre AS propietario,
            SUM(c.total) AS total_facturado,
            COALESCE((SELECT SUM(pg.monto) FROM pagos pg WHERE pg.id_cuenta = c.id_cuenta), 0) AS total_pagado,
            c.total - COALESCE((SELECT SUM(pg.monto) FROM pagos pg WHERE pg.id_cuenta = c.id_cuenta), 0) AS saldo
     FROM cuentas c
     JOIN propietarios pr ON pr.id_propietario = c.id_propietario
     WHERE c.estado IN ('pendiente', 'parcial')
     GROUP BY c.id_cuenta, c.id_propietario, pr.nombre, c.total`
  );
  return rows;
}

module.exports = { listar, obtenerPorId, crear, registrarPago, listarDeudas };