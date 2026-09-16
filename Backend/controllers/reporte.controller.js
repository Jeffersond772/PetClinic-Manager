const reporteModel = require('../models/reporte.model');

function validarRango(req, res) {
  const { desde, hasta } = req.query;
  if (!desde || !hasta) {
    res.status(400).json({ mensaje: 'Debes indicar el rango de fechas (desde y hasta)' });
    return null;
  }
  return { desde, hasta };
}

async function ingresos(req, res) {
  const rango = validarRango(req, res);
  if (!rango) return;
  try {
    const datos = await reporteModel.ingresosPorPeriodo(rango.desde, rango.hasta);
    res.json(datos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

async function gastos(req, res) {
  const rango = validarRango(req, res);
  if (!rango) return;
  try {
    const datos = await reporteModel.gastosPorPeriodo(rango.desde, rango.hasta);
    res.json(datos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

async function consultas(req, res) {
  const rango = validarRango(req, res);
  if (!rango) return;
  try {
    const datos = await reporteModel.consultasPorPeriodo(rango.desde, rango.hasta);
    res.json(datos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

async function productosMovimiento(req, res) {
  const rango = validarRango(req, res);
  if (!rango) return;
  try {
    const datos = await reporteModel.productosMayorMovimiento(rango.desde, rango.hasta);
    res.json(datos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

async function resumen(req, res) {
  const rango = validarRango(req, res);
  if (!rango) return;
  try {
    const datos = await reporteModel.resumenGeneral(rango.desde, rango.hasta);
    res.json(datos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

module.exports = { ingresos, gastos, consultas, productosMovimiento, resumen };