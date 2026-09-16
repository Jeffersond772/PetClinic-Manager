const gastoModel = require('../models/gasto.model');

async function listar(req, res) {
  try {
    const gastos = await gastoModel.listar();
    res.json(gastos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

// CU18: GET /api/gastos/rango?desde=...&hasta=...
async function porRango(req, res) {
  const { desde, hasta } = req.query;
  if (!desde || !hasta) {
    return res.status(400).json({ mensaje: 'Debes indicar el rango de fechas (desde y hasta)' });
  }
  try {
    const gastos = await gastoModel.listarPorRangoFecha(desde, hasta);
    res.json(gastos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

// CU17
async function crear(req, res) {
  const { concepto, categoria, monto, fecha } = req.body;

  if (!concepto || !monto || !fecha) {
    return res.status(400).json({ mensaje: 'Concepto, monto y fecha son obligatorios' });
  }

  try {
    const id_gasto = await gastoModel.crear({ concepto, categoria, monto, fecha, id_usuario: req.usuario.id_usuario });
    res.status(201).json({ mensaje: 'Gasto registrado correctamente', id_gasto });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

module.exports = { listar, porRango, crear };