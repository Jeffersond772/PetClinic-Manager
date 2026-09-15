const db = require('../config/db');

// CU06: registrar entrada de inventario
async function registrarEntrada({ id_producto, cantidad, costo_unitario, motivo, id_usuario, id_compra }) {
  const conexion = await db.getConnection();

  try {
    await conexion.beginTransaction();

    // Verificamos que el producto exista (flujo alternativo CU06)
    const [productos] = await conexion.query(
      `SELECT id_producto FROM productos WHERE id_producto = ? AND estado = 'activo'`,
      [id_producto]
    );
    if (productos.length === 0) {
      const error = new Error('El producto no está registrado en el sistema');
      error.codigoNegocio = 'PRODUCTO_NO_EXISTE';
      throw error;
    }

    const [resultado] = await conexion.query(
      `INSERT INTO movimientos_inventario (id_producto, tipo, motivo, cantidad, costo_unitario, id_usuario, id_compra)
       VALUES (?, 'entrada', ?, ?, ?, ?, ?)`,
      [id_producto, motivo || 'compra', cantidad, costo_unitario || 0, id_usuario, id_compra || null]
    );

    await conexion.query(
      `UPDATE productos SET cantidad_disponible = cantidad_disponible + ? WHERE id_producto = ?`,
      [cantidad, id_producto]
    );

    await conexion.commit();
    return resultado.insertId;

  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

// CU10: registrar salida de inventario
async function registrarSalida({ id_producto, cantidad, motivo, id_usuario, id_consulta }) {
  const conexion = await db.getConnection();

  try {
    await conexion.beginTransaction();

    // Bloqueamos la fila del producto (FOR UPDATE) para evitar que dos salidas simultáneas
    // descuenten stock que ya no existe (condición de carrera)
    const [productos] = await conexion.query(
      `SELECT id_producto, cantidad_disponible FROM productos
       WHERE id_producto = ? AND estado = 'activo' FOR UPDATE`,
      [id_producto]
    );

    if (productos.length === 0) {
      const error = new Error('El producto no está registrado en el sistema');
      error.codigoNegocio = 'PRODUCTO_NO_EXISTE';
      throw error;
    }

    // Flujo alternativo CU10: cantidad solicitada supera las existencias
    if (Number(productos[0].cantidad_disponible) < Number(cantidad)) {
      const error = new Error('La cantidad solicitada supera las existencias disponibles');
      error.codigoNegocio = 'STOCK_INSUFICIENTE';
      throw error;
    }

    const [resultado] = await conexion.query(
      `INSERT INTO movimientos_inventario (id_producto, tipo, motivo, cantidad, id_usuario, id_consulta)
       VALUES (?, 'salida', ?, ?, ?, ?)`,
      [id_producto, motivo || 'venta', cantidad, id_usuario, id_consulta || null]
    );

    await conexion.query(
      `UPDATE productos SET cantidad_disponible = cantidad_disponible - ? WHERE id_producto = ?`,
      [cantidad, id_producto]
    );

    await conexion.commit();
    return resultado.insertId;

  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

// RF31: historial de movimientos de un producto
async function listarPorProducto(id_producto) {
  const [rows] = await db.query(
    `SELECT m.id_movimiento, m.tipo, m.motivo, m.cantidad, m.costo_unitario, m.fecha,
            u.nombre AS usuario
     FROM movimientos_inventario m
     JOIN usuarios u ON u.id_usuario = m.id_usuario
     WHERE m.id_producto = ?
     ORDER BY m.fecha DESC`,
    [id_producto]
  );
  return rows;
}

// Historial general (para reportes, CU19)
async function listarTodos() {
  const [rows] = await db.query(
    `SELECT m.id_movimiento, m.tipo, m.motivo, m.cantidad, m.fecha,
            p.nombre AS producto, u.nombre AS usuario
     FROM movimientos_inventario m
     JOIN productos p ON p.id_producto = m.id_producto
     JOIN usuarios u ON u.id_usuario = m.id_usuario
     ORDER BY m.fecha DESC
     LIMIT 200`
  );
  return rows;
}

module.exports = { registrarEntrada, registrarSalida, listarPorProducto, listarTodos };