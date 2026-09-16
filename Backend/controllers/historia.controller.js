const historiaModel = require('../models/historia.model');

// CU14
async function obtenerHistoria(req, res) {
  try {
    const historia = await historiaModel.obtenerPorPaciente(req.params.idPaciente);

    // Flujo alternativo CU14: el paciente no tiene historia clínica registrada
    if (!historia) {
      return res.status(404).json({ mensaje: 'El paciente no tiene historia clínica registrada' });
    }

    res.json(historia);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

// CU15
async function registrarProcedimiento(req, res) {
  const { id_paciente, tipo, id_producto, cantidad, fecha, observaciones } = req.body;

  if (!id_paciente || !tipo || !fecha) {
    return res.status(400).json({ mensaje: 'Paciente, tipo de procedimiento y fecha son obligatorios' });
  }

  try {
    const id_procedimiento = await historiaModel.registrarProcedimientoPreventivo({
      id_paciente, tipo, id_producto, cantidad,
      id_veterinario: req.usuario.id_usuario,
      fecha, observaciones
    });

    res.status(201).json({ mensaje: 'Procedimiento registrado correctamente', id_procedimiento });

  } catch (error) {
    if (error.codigoNegocio === 'SIN_HISTORIA') {
      return res.status(404).json({ mensaje: error.message });
    }
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

module.exports = { obtenerHistoria, registrarProcedimiento };