const reporteModel = require('../models/reporte.model');
const { respuestaError } = require('../utils/manejarError');

function validarRango(req, res) {
  const { desde, hasta } = req.query;
  if (!desde || !hasta) {
    respuestaError(res, new Error('Debes indicar el rango de fechas (desde y hasta)'));
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
    respuestaError(res, error);
  }
}

async function gastos(req, res) {
  const rango = validarRango(req, res);
  if (!rango) return;
  try {
    const datos = await reporteModel.gastosPorPeriodo(rango.desde, rango.hasta);
    res.json(datos);
  } catch (error) {
    respuestaError(res, error);
  }
}

async function consultas(req, res) {
  const rango = validarRango(req, res);
  if (!rango) return;
  try {
    const datos = await reporteModel.consultasPorPeriodo(rango.desde, rango.hasta);
    res.json(datos);
  } catch (error) {
    respuestaError(res, error);
  }
}

async function productosMovimiento(req, res) {
  const rango = validarRango(req, res);
  if (!rango) return;
  try {
    const datos = await reporteModel.productosMayorMovimiento(rango.desde, rango.hasta);
    res.json(datos);
  } catch (error) {
    respuestaError(res, error);
  }
}

async function resumen(req, res) {
  const rango = validarRango(req, res);
  if (!rango) return;
  try {
    const datos = await reporteModel.resumenGeneral(rango.desde, rango.hasta);
    res.json(datos);
  } catch (error) {
    respuestaError(res, error);
  }
}

async function citasEstado(req, res) {
  const rango = validarRango(req, res);
  if (!rango) return;
  try {
    const datos = await reporteModel.citasPorEstado(rango.desde, rango.hasta);
    res.json(datos);
  } catch (error) {
    respuestaError(res, error);
  }
}

module.exports = { ingresos, gastos, consultas, productosMovimiento, resumen, citasEstado };