const db = require('../config/db');

// CU21: ingresos por día en un rango de fechas
async function ingresosPorPeriodo(desde, hasta) {
  const [rows] = await db.query(
    `SELECT DATE(fecha) AS dia, SUM(monto) AS total
     FROM pagos
     WHERE DATE(fecha) BETWEEN ? AND ?
     GROUP BY DATE(fecha)
     ORDER BY dia`,
    [desde, hasta]
  );
  return rows;
}

// CU21: gastos por día en un rango de fechas
async function gastosPorPeriodo(desde, hasta) {
  const [rows] = await db.query(
    `SELECT fecha AS dia, SUM(monto) AS total
     FROM gastos
     WHERE fecha BETWEEN ? AND ?
     GROUP BY fecha
     ORDER BY dia`,
    [desde, hasta]
  );
  return rows;
}

// CU20: consultas realizadas y pacientes atendidos en un período
async function consultasPorPeriodo(desde, hasta) {
  const [detalle] = await db.query(
    `SELECT c.id_consulta, c.fecha, p.nombre AS paciente, u.nombre AS veterinario, c.diagnostico
     FROM consultas c
     JOIN pacientes p ON p.id_paciente = c.id_paciente
     JOIN usuarios u ON u.id_usuario = c.id_veterinario
     WHERE DATE(c.fecha) BETWEEN ? AND ?
     ORDER BY c.fecha DESC`,
    [desde, hasta]
  );

  const [porDia] = await db.query(
    `SELECT DATE(fecha) AS dia, COUNT(*) AS total
     FROM consultas
     WHERE DATE(fecha) BETWEEN ? AND ?
     GROUP BY DATE(fecha)
     ORDER BY dia`,
    [desde, hasta]
  );

  const [pacientesUnicos] = await db.query(
    `SELECT COUNT(DISTINCT id_paciente) AS total
     FROM consultas
     WHERE DATE(fecha) BETWEEN ? AND ?`,
    [desde, hasta]
  );

  return { detalle, porDia, pacientesAtendidos: pacientesUnicos[0].total };
}

// CU19: productos con mayor movimiento (más salidas) en un período
async function productosMayorMovimiento(desde, hasta) {
  const [rows] = await db.query(
    `SELECT p.nombre, SUM(m.cantidad) AS total_movido
     FROM movimientos_inventario m
     JOIN productos p ON p.id_producto = m.id_producto
     WHERE m.tipo = 'salida' AND DATE(m.fecha) BETWEEN ? AND ?
     GROUP BY m.id_producto, p.nombre
     ORDER BY total_movido DESC
     LIMIT 10`,
    [desde, hasta]
  );
  return rows;
}

// CU21 + dashboard: resumen general de un período, todo en paralelo
async function resumenGeneral(desde, hasta) {
  const [[ingresos], [gastos], [citasAtendidas], [bajoStock], [deudas]] = await Promise.all([
    db.query(`SELECT COALESCE(SUM(monto), 0) AS total FROM pagos WHERE DATE(fecha) BETWEEN ? AND ?`, [desde, hasta]),
    db.query(`SELECT COALESCE(SUM(monto), 0) AS total FROM gastos WHERE fecha BETWEEN ? AND ?`, [desde, hasta]),
    db.query(`SELECT COUNT(*) AS total FROM citas WHERE estado = 'atendida' AND fecha BETWEEN ? AND ?`, [desde, hasta]),
    db.query(`SELECT COUNT(*) AS total FROM productos WHERE cantidad_disponible <= stock_minimo AND estado = 'activo'`),
    db.query(`SELECT COALESCE(SUM(total), 0) AS total FROM cuentas WHERE estado IN ('pendiente', 'parcial')`)
  ]);

  return {
    ingresos: Number(ingresos[0].total),
    gastos: Number(gastos[0].total),
    saldo: Number(ingresos[0].total) - Number(gastos[0].total),
    citasAtendidas: citasAtendidas[0].total,
    productosBajoStock: bajoStock[0].total,
    deudasPendientes: Number(deudas[0].total)
  };
}

module.exports = { ingresosPorPeriodo, gastosPorPeriodo, consultasPorPeriodo, productosMayorMovimiento, resumenGeneral };