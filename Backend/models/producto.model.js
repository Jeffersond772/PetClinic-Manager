const db = require('../config/db');

async function listar() {
  const [rows] = await db.query(
    `SELECT p.id_producto, p.nombre, p.precio, p.cantidad_disponible, p.unidad_medida,
            p.stock_minimo, p.fecha_vencimiento, p.estado,
            c.id_categoria, c.nombre AS categoria,
            pv.id_proveedor, pv.nombre AS proveedor
     FROM productos p
     JOIN categorias_producto c ON c.id_categoria = p.id_categoria
     LEFT JOIN proveedores pv ON pv.id_proveedor = p.id_proveedor
     WHERE p.estado = 'activo'
     ORDER BY p.nombre`
  );
  return rows;
}

async function obtenerPorId(id_producto) {
  const [rows] = await db.query(
    `SELECT p.*, c.nombre AS categoria, pv.nombre AS proveedor
     FROM productos p
     JOIN categorias_producto c ON c.id_categoria = p.id_categoria
     LEFT JOIN proveedores pv ON pv.id_proveedor = p.id_proveedor
     WHERE p.id_producto = ?`,
    [id_producto]
  );
  return rows[0];
}

async function buscar(termino) {
  const like = `%${termino}%`;
  const [rows] = await db.query(
    `SELECT p.id_producto, p.nombre, p.precio, p.cantidad_disponible, c.nombre AS categoria
     FROM productos p
     JOIN categorias_producto c ON c.id_categoria = p.id_categoria
     WHERE p.nombre LIKE ? AND p.estado = 'activo'
     ORDER BY p.nombre
     LIMIT 20`,
    [like]
  );
  return rows;
}

// CU11: productos en o por debajo del stock mínimo
async function listarBajoStock() {
  const [rows] = await db.query(
    `SELECT id_producto, nombre, cantidad_disponible, stock_minimo
     FROM productos
     WHERE cantidad_disponible <= stock_minimo AND estado = 'activo'
     ORDER BY nombre`
  );
  return rows;
}

// Productos próximos a vencer (siguientes 30 días)
async function listarProximosAVencer() {
  const [rows] = await db.query(
    `SELECT id_producto, nombre, fecha_vencimiento, cantidad_disponible
     FROM productos
     WHERE fecha_vencimiento IS NOT NULL
       AND fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
       AND estado = 'activo'
     ORDER BY fecha_vencimiento`
  );
  return rows;
}

// CU04: registrar producto
async function crear({ nombre, id_categoria, id_proveedor, precio, unidad_medida, stock_minimo, fecha_vencimiento, descripcion }) {
  const [resultado] = await db.query(
    `INSERT INTO productos (nombre, id_categoria, id_proveedor, precio, unidad_medida, stock_minimo, fecha_vencimiento, descripcion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [nombre, id_categoria, id_proveedor || null, precio, unidad_medida || 'unidad', stock_minimo || 0, fecha_vencimiento || null, descripcion || null]
  );
  return resultado.insertId;
}

// CU05: actualizar producto (no toca cantidad_disponible, eso solo lo mueven las entradas/salidas)
async function actualizar(id_producto, { nombre, id_categoria, id_proveedor, precio, unidad_medida, stock_minimo, fecha_vencimiento, descripcion }) {
  await db.query(
    `UPDATE productos
     SET nombre = ?, id_categoria = ?, id_proveedor = ?, precio = ?, unidad_medida = ?, stock_minimo = ?, fecha_vencimiento = ?, descripcion = ?
     WHERE id_producto = ?`,
    [nombre, id_categoria, id_proveedor || null, precio, unidad_medida, stock_minimo, fecha_vencimiento || null, descripcion || null, id_producto]
  );
}

// Se usa internamente desde movimiento.model.js, nunca se llama directo desde un controlador
async function ajustarCantidad(id_producto, cantidadDelta) {
  await db.query(
    `UPDATE productos SET cantidad_disponible = cantidad_disponible + ? WHERE id_producto = ?`,
    [cantidadDelta, id_producto]
  );
}

module.exports = {
  listar, obtenerPorId, buscar, listarBajoStock, listarProximosAVencer,
  crear, actualizar, ajustarCantidad
};