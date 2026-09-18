const db = require('../config/db');

async function listar() {
  const [rows] = await db.query(
    `SELECT c.id_compra, c.fecha, c.total, pv.nombre AS proveedor, u.nombre AS registrado_por
     FROM compras c
     JOIN proveedores pv ON pv.id_proveedor = c.id_proveedor
     JOIN usuarios u ON u.id_usuario = c.id_usuario
     ORDER BY c.fecha DESC`
  );
  return rows;
}

async function obtenerPorId(id_compra) {
  const [compras] = await db.query(
    `SELECT c.*, pv.nombre AS proveedor, u.nombre AS registrado_por
     FROM compras c
     JOIN proveedores pv ON pv.id_proveedor = c.id_proveedor
     JOIN usuarios u ON u.id_usuario = c.id_usuario
     WHERE c.id_compra = ?`,
    [id_compra]
  );
  const compra = compras[0];
  if (!compra) return null;

  const [detalle] = await db.query(
    `SELECT dc.id_detalle_compra, dc.cantidad, dc.costo_unitario, dc.fecha_vencimiento, p.nombre AS producto
     FROM detalle_compras dc
     JOIN productos p ON p.id_producto = dc.id_producto
     WHERE dc.id_compra = ?`,
    [id_compra]
  );
  compra.detalle = detalle;
  return compra;
}

// CU: registrar compra con varios productos, actualiza inventario y costo promedio automáticamente
async function crear({ id_proveedor, id_usuario, items }) {
  const conexion = await db.getConnection();

  try {
    await conexion.beginTransaction();

    let total = 0;
    for (const item of items) {
      total += Number(item.cantidad) * Number(item.costo_unitario);
    }

    const [resultadoCompra] = await conexion.query(
      `INSERT INTO compras (id_proveedor, id_usuario, total) VALUES (?, ?, ?)`,
      [id_proveedor, id_usuario, total]
    );
    const id_compra = resultadoCompra.insertId;

    for (const item of items) {
      const [productos] = await conexion.query(
        `SELECT cantidad_disponible, costo_promedio FROM productos WHERE id_producto = ? AND estado = 'activo' FOR UPDATE`,
        [item.id_producto]
      );

      if (productos.length === 0) {
        const error = new Error(`Uno de los productos seleccionados no existe`);
        error.codigoNegocio = 'ITEM_NO_EXISTE';
        throw error;
      }

      await conexion.query(
        `INSERT INTO detalle_compras (id_compra, id_producto, cantidad, costo_unitario, fecha_vencimiento)
         VALUES (?, ?, ?, ?, ?)`,
        [id_compra, item.id_producto, item.cantidad, item.costo_unitario, item.fecha_vencimiento || null]
      );

      // Costo promedio ponderado (misma lógica que las entradas individuales de inventario)
      const cantidadPrevia = Number(productos[0].cantidad_disponible);
      const costoPrevio = Number(productos[0].costo_promedio);
      const cantidadEntrada = Number(item.cantidad);
      const costoEntrada = Number(item.costo_unitario);
      const nuevoCostoPromedio = (cantidadPrevia + cantidadEntrada) > 0
        ? ((cantidadPrevia * costoPrevio) + (cantidadEntrada * costoEntrada)) / (cantidadPrevia + cantidadEntrada)
        : costoEntrada;

      await conexion.query(
        `UPDATE productos SET cantidad_disponible = cantidad_disponible + ?, costo_promedio = ?${item.fecha_vencimiento ? ', fecha_vencimiento = ?' : ''}
         WHERE id_producto = ?`,
        item.fecha_vencimiento
          ? [item.cantidad, nuevoCostoPromedio.toFixed(2), item.fecha_vencimiento, item.id_producto]
          : [item.cantidad, nuevoCostoPromedio.toFixed(2), item.id_producto]
      );

      await conexion.query(
        `INSERT INTO movimientos_inventario (id_producto, tipo, motivo, cantidad, costo_unitario, id_usuario, id_compra)
         VALUES (?, 'entrada', 'compra', ?, ?, ?, ?)`,
        [item.id_producto, item.cantidad, item.costo_unitario, id_usuario, id_compra]
      );
    }

    await conexion.commit();
    return id_compra;

  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

module.exports = { listar, obtenerPorId, crear };