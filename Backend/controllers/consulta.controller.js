const consultaModel = require('../models/consulta.model');

async function listarPorPaciente(req, res) {
  try {
    const consultas = await consultaModel.listarPorPaciente(req.params.idPaciente);
    res.json(consultas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

async function obtener(req, res) {
  try {
    const consulta = await consultaModel.obtenerPorId(req.params.id);
    if (!consulta) {
      return res.status(404).json({ mensaje: 'Consulta no encontrada' });
    }
    res.json(consulta);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

// CU08: registrar consulta (con tratamientos opcionales que descuentan inventario)
async function crear(req, res) {
  const { id_paciente, id_cita, motivo_consulta, sintomas, signos_vitales,
          peso, diagnostico, procedimientos_realizados, observaciones, tratamientos } = req.body;

  if (!id_paciente) {
    return res.status(400).json({ mensaje: 'El paciente es obligatorio' });
  }

  try {
    const id_consulta = await consultaModel.crear({
      id_paciente,
      id_veterinario: req.usuario.id_usuario, // siempre del token, nunca del body
      id_cita,
      motivo_consulta, sintomas, signos_vitales, peso, diagnostico, procedimientos_realizados, observaciones,
      tratamientos
    });

    res.status(201).json({ mensaje: 'Consulta registrada correctamente', id_consulta });

  } catch (error) {
    if (error.codigoNegocio === 'STOCK_INSUFICIENTE') {
      return res.status(409).json({ mensaje: error.message });
    }
    if (error.codigoNegocio === 'PRODUCTO_NO_EXISTE') {
      return res.status(404).json({ mensaje: error.message });
    }
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

module.exports = { listarPorPaciente, obtener, crear };