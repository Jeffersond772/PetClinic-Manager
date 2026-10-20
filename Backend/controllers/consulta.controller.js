const consultaModel = require('../models/consulta.model');
const { respuestaError } = require('../utils/manejarError');

async function listarPorPaciente(req, res) {
  try {
    const consultas = await consultaModel.listarPorPaciente(req.params.idPaciente);
    res.json(consultas);
  } catch (error) {
    respuestaError(res, error);
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
    respuestaError(res, error);
  }
}

// CU08: registra consulta, inventario y venta automáticamente cuando hay productos/servicios cobrables.
async function crear(req, res) {
  const {
    id_paciente, id_cita, motivo_consulta, sintomas, signos_vitales,
    peso, diagnostico, procedimientos_realizados, observaciones,
    tratamientos, servicios_cobrables
  } = req.body;

  if (!id_paciente) {
    return res.status(400).json({ mensaje: 'El paciente es obligatorio' });
  }

  if (tratamientos !== undefined && !Array.isArray(tratamientos)) {
    return res.status(400).json({ mensaje: 'Los tratamientos deben enviarse en formato de lista' });
  }

  if (servicios_cobrables !== undefined && !Array.isArray(servicios_cobrables)) {
    return res.status(400).json({ mensaje: 'Los servicios cobrables deben enviarse en formato de lista' });
  }

  try {
    const resultado = await consultaModel.crear({
      id_paciente,
      id_veterinario: req.usuario.id_usuario, // siempre del token, nunca del body
      id_cita,
      motivo_consulta, sintomas, signos_vitales, peso, diagnostico,
      procedimientos_realizados, observaciones, tratamientos, servicios_cobrables
    });

    res.status(201).json({
      mensaje: resultado.id_cuenta
        ? 'Consulta registrada y venta generada correctamente'
        : 'Consulta registrada correctamente. No se generó una venta porque no hay productos o servicios cobrables seleccionados',
      id_consulta: resultado.id_consulta,
      id_cuenta: resultado.id_cuenta,
      total_facturado: resultado.total_facturado
    });

  } catch (error) {
    if (error.codigoNegocio === 'STOCK_INSUFICIENTE') {
      return res.status(409).json({ mensaje: error.message });
    }
    if (error.codigoNegocio === 'PRODUCTO_NO_EXISTE' || error.codigoNegocio === 'SERVICIO_NO_EXISTE') {
      return res.status(404).json({ mensaje: error.message });
    }
    if (error.codigoNegocio === 'PACIENTE_NO_EXISTE') {
      return res.status(404).json({ mensaje: error.message });
    }
    if (error.codigoNegocio === 'CITA_NO_VALIDA') {
      return res.status(400).json({ mensaje: error.message });
    }
    if (error.codigoNegocio === 'CITA_NO_DISPONIBLE') {
      return res.status(409).json({ mensaje: error.message });
    }
    if (error.codigoNegocio === 'CANTIDAD_INVALIDA' || error.codigoNegocio === 'ITEM_FACTURACION_INVALIDO') {
      return res.status(400).json({ mensaje: error.message });
    }
    respuestaError(res, error);
  }
}

module.exports = { listarPorPaciente, obtener, crear };