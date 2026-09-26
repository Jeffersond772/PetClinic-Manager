const usuarioModel = require('../models/usuario.model');
const citaModel = require('../models/cita.model');
const { respuestaError } = require('../utils/manejarError');
const { obtenerFechaHoyLocal } = require('../utils/fecha');

async function listar(req, res) {
  try {
    const citas = await citaModel.listar();
    res.json(citas);
    } catch (error) {
    respuestaError(res, error);
  }
}

async function obtener(req, res) {
  try {
    const cita = await citaModel.obtenerPorId(req.params.id);
    if (!cita) {
      return res.status(404).json({ mensaje: 'Cita no encontrada' });
    }
    res.json(cita);
    } catch (error) {
    respuestaError(res, error);
  }
}

// CU13: GET /api/citas/agenda?desde=2026-09-01&hasta=2026-09-07&id_veterinario=3
async function agenda(req, res) {
  const { desde, hasta, id_veterinario } = req.query;

  if (!desde || !hasta) {
    return res.status(400).json({ mensaje: 'Debes indicar el rango de fechas (desde y hasta)' });
  }

  try {
    const citas = await citaModel.listarPorRangoFecha(desde, hasta, id_veterinario);

    if (citas.length === 0) {
      // Flujo alternativo CU13: no existen citas programadas para el período
      return res.json({ mensaje: 'No existen citas programadas para el período seleccionado', citas: [] });
    }

    res.json({ citas });
    } catch (error) {
    respuestaError(res, error);
  }
}

// CU07: agendar cita
async function crear(req, res) {
  const { id_paciente, id_propietario, id_veterinario, fecha, hora, motivo, forzar } = req.body;

  if (!id_paciente || !id_propietario || !id_veterinario || !fecha || !hora) {
    return res.status(400).json({ mensaje: 'Paciente, propietario, veterinario, fecha y hora son obligatorios' });
  }

  const hoy = obtenerFechaHoyLocal();
  if (fecha < hoy) {
    return res.status(400).json({ mensaje: 'No se puede agendar una cita en una fecha anterior a hoy' });
  }

  try {
    // Flujo alternativo CU07: horario ya ocupado
    const hayConflicto = await citaModel.existeConflictoHorario(id_veterinario, fecha, hora);
    if (hayConflicto) {
      return res.status(409).json({ mensaje: 'El horario seleccionado ya está ocupado para este veterinario' });
    }

    // Horario laboral del veterinario (un Administrador puede forzar la excepción)
    const infoHorario = await usuarioModel.estaDentroDeHorarioLaboral(id_veterinario, hora);
    const puedeForzar = req.usuario.rol === 'Administrador' && forzar === true;
    if (infoHorario && !infoHorario.dentro && !puedeForzar) {
      return res.status(400).json({
        mensaje: `Este veterinario labora de ${infoHorario.hora_inicio_laboral.slice(0,5)} a ${infoHorario.hora_fin_laboral.slice(0,5)}.` +
          (req.usuario.rol === 'Administrador' ? ' Activa "Permitir fuera de horario" si deseas agendarla de todas formas.' : ' Contacta a un administrador si necesitas un horario distinto.')
      });
    }

    const id_cita = await citaModel.crear({ id_paciente, id_propietario, id_veterinario, fecha, hora, motivo });
    res.status(201).json({ mensaje: 'Cita agendada correctamente', id_cita });

  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ mensaje: 'El paciente, propietario o veterinario indicados no existen' });
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ mensaje: 'El horario seleccionado ya está ocupado para este veterinario' });
    }
    respuestaError(res, error);
  }
}

// CU12: modificar cita
async function actualizar(req, res) {
  const { fecha, hora, motivo, id_veterinario, forzar } = req.body;

  if (!fecha || !hora || !id_veterinario) {
    return res.status(400).json({ mensaje: 'Fecha, hora y veterinario son obligatorios' });
  }

  const hoy = obtenerFechaHoyLocal();
  if (fecha < hoy) {
    return res.status(400).json({ mensaje: 'No se puede modificar la cita a una fecha anterior a hoy' });
  }

  try {
    const cita = await citaModel.obtenerPorId(req.params.id);
    if (!cita) {
      return res.status(404).json({ mensaje: 'Cita no encontrada' });
    }

    // Flujo alternativo CU12: el nuevo horario ya está ocupado
    const hayConflicto = await citaModel.existeConflictoHorario(id_veterinario, fecha, hora, req.params.id);
    if (hayConflicto) {
      return res.status(409).json({ mensaje: 'El nuevo horario ya está ocupado para este veterinario' });
    }

    const infoHorario = await usuarioModel.estaDentroDeHorarioLaboral(id_veterinario, hora);
    const puedeForzar = req.usuario.rol === 'Administrador' && forzar === true;
    if (infoHorario && !infoHorario.dentro && !puedeForzar) {
      return res.status(400).json({
        mensaje: `Este veterinario labora de ${infoHorario.hora_inicio_laboral.slice(0,5)} a ${infoHorario.hora_fin_laboral.slice(0,5)}.` +
          (req.usuario.rol === 'Administrador' ? ' Activa "Permitir fuera de horario" si deseas agendarla de todas formas.' : ' Contacta a un administrador si necesitas un horario distinto.')
      });
    }

    await citaModel.actualizar(req.params.id, { fecha, hora, motivo, id_veterinario });
    res.json({ mensaje: 'Cita actualizada correctamente' });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ mensaje: 'El nuevo horario ya está ocupado para este veterinario' });
    }
    respuestaError(res, error);
  }
}

// CU12: cancelar cita
async function cancelar(req, res) {
  try {
    const cita = await citaModel.obtenerPorId(req.params.id);
    if (!cita) {
      return res.status(404).json({ mensaje: 'Cita no encontrada' });
    }
    await citaModel.cambiarEstado(req.params.id, 'cancelada');
    res.json({ mensaje: 'Cita cancelada correctamente' });
    } catch (error) {
    respuestaError(res, error);
  }
}

// Marcar como atendida o no_asistio (útil para el flujo del día de la cita)
async function cambiarEstado(req, res) {
  const { estado } = req.body;
  const estadosValidos = ['programada', 'atendida', 'cancelada', 'no_asistio'];

  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ mensaje: 'Estado inválido' });
  }

  try {
    const cita = await citaModel.obtenerPorId(req.params.id);
    if (!cita) {
      return res.status(404).json({ mensaje: 'Cita no encontrada' });
    }
    await citaModel.cambiarEstado(req.params.id, estado);
    res.json({ mensaje: 'Estado de la cita actualizado correctamente' });
    } catch (error) {
    respuestaError(res, error);
  }
}

module.exports = { listar, obtener, agenda, crear, actualizar, cancelar, cambiarEstado };