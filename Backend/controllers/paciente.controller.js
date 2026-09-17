const pacienteModel = require('../models/paciente.model');
const { respuestaError } = require('../utils/manejarError');

async function listar(req, res) {
  try {
    const pacientes = await pacienteModel.listar();
    res.json(pacientes);
  } catch (error) {
    respuestaError(res, error);
  }
}

async function obtener(req, res) {
  try {
    const paciente = await pacienteModel.obtenerPorId(req.params.id);
    if (!paciente) {
      return res.status(404).json({ mensaje: 'Paciente no encontrado' });
    }
    res.json(paciente);
    } catch (error) {
    respuestaError(res, error);
  }
}

// CU14: búsqueda por nombre, propietario o identificación (?q=termino)
async function buscar(req, res) {
  const termino = req.query.q;

  if (!termino) {
    return res.status(400).json({ mensaje: 'Debes enviar un término de búsqueda (?q=...)' });
  }

  try {
    const resultados = await pacienteModel.buscar(termino);
    res.json(resultados);
    } catch (error) {
    respuestaError(res, error);
  }
}

// Mascotas de un propietario específico
async function porPropietario(req, res) {
  try {
    const pacientes = await pacienteModel.listarPorPropietario(req.params.idPropietario);
    res.json(pacientes);
  } catch (error) {
    respuestaError(res, error);
  }
}

async function crear(req, res) {
  const { nombre, id_especie, id_raza, sexo, fecha_nacimiento, peso, caracteristicas, id_propietario } = req.body;

  if (!nombre || !id_especie || !id_propietario) {
    return res.status(400).json({ mensaje: 'Nombre, especie y propietario son obligatorios' });
  }

  try {
    const id_paciente = await pacienteModel.crear({
      nombre, id_especie, id_raza, sexo, fecha_nacimiento, peso, caracteristicas, id_propietario
    });

    res.status(201).json({ mensaje: 'Paciente registrado correctamente', id_paciente });

  } catch (error) {
    // El propietario, especie o raza indicados no existen (violación de llave foránea)
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ mensaje: 'El propietario, especie o raza indicados no existen' });
    }
    respuestaError(res, error);
  }
}

async function actualizar(req, res) {
  const { nombre, id_especie, id_raza, sexo, fecha_nacimiento, peso, caracteristicas } = req.body;

  if (!nombre || !id_especie) {
    return res.status(400).json({ mensaje: 'Nombre y especie son obligatorios' });
  }

  try {
    const paciente = await pacienteModel.obtenerPorId(req.params.id);
    if (!paciente) {
      return res.status(404).json({ mensaje: 'Paciente no encontrado' });
    }

    await pacienteModel.actualizar(req.params.id, {
      nombre, id_especie, id_raza, sexo, fecha_nacimiento, peso, caracteristicas
    });

    res.json({ mensaje: 'Paciente actualizado correctamente' });

  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ mensaje: 'La especie o raza indicadas no existen' });
    }
    respuestaError(res, error);
  }
}

module.exports = { listar, obtener, buscar, porPropietario, crear, actualizar };