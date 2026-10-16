const historiaModel = require('../models/historia.model');
const { respuestaError } = require('../utils/manejarError');
const { obtenerFechaHoyLocal } = require('../utils/fecha');

// CU14
async function obtenerHistoria(req, res) {
  try {
    const historia = await historiaModel.obtenerPorPaciente(req.params.idPaciente);

    if (!historia) {
      return res.status(404).json({ mensaje: 'El paciente no tiene historia clínica registrada' });
    }

    res.json(historia);
  } catch (error) {
    respuestaError(res, error);
  }
}

// CU15
async function registrarProcedimiento(req, res) {
  const { id_paciente, tipo, id_producto, cantidad, id_servicio, fecha, observaciones } = req.body;

  if (!id_paciente || !tipo || !fecha) {
    return res.status(400).json({ mensaje: 'Paciente, tipo de procedimiento y fecha son obligatorios' });
  }

  if (!['vacuna', 'desparasitacion', 'otro'].includes(tipo)) {
    return res.status(400).json({ mensaje: 'El tipo debe ser vacuna, desparasitación u otro' });
  }

  if (id_producto && (cantidad === null || cantidad === undefined || cantidad === '' || !Number.isFinite(Number(cantidad)) || Number(cantidad) <= 0)) {
    return res.status(400).json({ mensaje: 'Indica una cantidad mayor que cero para el producto aplicado' });
  }

  const hoy = obtenerFechaHoyLocal();
  if (fecha > hoy) {
    return res.status(400).json({ mensaje: 'La fecha del procedimiento no puede ser futura' });
  }

  try {
    const resultado = await historiaModel.registrarProcedimientoPreventivo({
      id_paciente, tipo, id_producto, cantidad, id_servicio,
      id_veterinario: req.usuario.id_usuario,
      fecha, observaciones
    });

    res.status(201).json({
      mensaje: resultado.id_cuenta
        ? 'Procedimiento registrado y venta generada correctamente'
        : 'Procedimiento registrado correctamente. No se generó una venta porque no seleccionaste un producto ni un servicio cobrable',
      id_procedimiento: resultado.id_procedimiento,
      id_cuenta: resultado.id_cuenta,
      total_facturado: resultado.total_facturado
    });

  } catch (error) {
    if (error.codigoNegocio === 'SIN_HISTORIA' || error.codigoNegocio === 'PRODUCTO_NO_EXISTE' || error.codigoNegocio === 'SERVICIO_NO_EXISTE') {
      return res.status(404).json({ mensaje: error.message });
    }
    if (error.codigoNegocio === 'STOCK_INSUFICIENTE') {
      return res.status(409).json({ mensaje: error.message });
    }
    if (error.codigoNegocio === 'CANTIDAD_INVALIDA' || error.codigoNegocio === 'ITEM_FACTURACION_INVALIDO') {
      return res.status(400).json({ mensaje: error.message });
    }
    respuestaError(res, error);
  }
}

module.exports = { obtenerHistoria, registrarProcedimiento };