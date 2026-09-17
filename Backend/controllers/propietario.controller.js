const propietarioModel = require('../models/propietario.model');
const { respuestaError } = require('../utils/manejarError');

async function listar(req, res) {
  try {
    const propietarios = await propietarioModel.listar();
    res.json(propietarios);
  } catch (error) {
    respuestaError(res, error);
  }
}

async function obtener(req, res) {
  try {
    const propietario = await propietarioModel.obtenerPorId(req.params.id);
    if (!propietario) {
      return res.status(404).json({ mensaje: 'Propietario no encontrado' });
    }
    res.json(propietario);
  } catch (error) {
    respuestaError(res, error);
  }
}

// Buscar por nombre o identificación (?q=termino)
async function buscar(req, res) {
  const termino = req.query.q;

  if (!termino) {
    return res.status(400).json({ mensaje: 'Debes enviar un término de búsqueda (?q=...)' });
  }

  try {
    const resultados = await propietarioModel.buscar(termino);
    res.json(resultados);
  } catch (error) {
    respuestaError(res, error);
  }
}

async function crear(req, res) {
  const { nombre, telefono, correo, direccion, identificacion } = req.body;

  if (!nombre) {
    return res.status(400).json({ mensaje: 'El nombre del propietario es obligatorio' });
  }

  try {
    const id_propietario = await propietarioModel.crear({ nombre, telefono, correo, direccion, identificacion });
    res.status(201).json({ mensaje: 'Propietario registrado correctamente', id_propietario });
  } catch (error) {
    // Error de duplicado (identificación ya existe, por el UNIQUE de tu tabla)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ mensaje: 'Ya existe un propietario con esa identificación' });
    }
    respuestaError(res, error);
  }
}

async function actualizar(req, res) {
  const { nombre, telefono, correo, direccion, identificacion } = req.body;

  try {
    const propietario = await propietarioModel.obtenerPorId(req.params.id);
    if (!propietario) {
      return res.status(404).json({ mensaje: 'Propietario no encontrado' });
    }

    await propietarioModel.actualizar(req.params.id, { nombre, telefono, correo, direccion, identificacion });
    res.json({ mensaje: 'Propietario actualizado correctamente' });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ mensaje: 'Ya existe otro propietario con esa identificación' });
    }
    respuestaError(res, error);
  }
}

module.exports = { listar, obtener, buscar, crear, actualizar };