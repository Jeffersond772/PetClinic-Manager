const servicioModel = require('../models/servicio.model');
const { respuestaError } = require('../utils/manejarError');

async function listar(req, res) {
  try {
    const servicios = await servicioModel.listar();
    res.json(servicios);
  } catch (error) {
    respuestaError(res, error);
  }
}

async function crear(req, res) {
  const { nombre, precio, descripcion } = req.body;

  if (!nombre || precio === undefined) {
    return res.status(400).json({ mensaje: 'Nombre y precio son obligatorios' });
  }

  try {
    const id_servicio = await servicioModel.crear({ nombre, precio, descripcion });
    res.status(201).json({ mensaje: 'Servicio registrado correctamente', id_servicio });
  } catch (error) {
    respuestaError(res, error);
  } 
}

async function actualizar(req, res) {
  const { nombre, precio, descripcion } = req.body;

  if (!nombre || precio === undefined) {
    return res.status(400).json({ mensaje: 'Nombre y precio son obligatorios' });
  }

  try {
    const servicio = await servicioModel.obtenerPorId(req.params.id);
    if (!servicio) {
      return res.status(404).json({ mensaje: 'Servicio no encontrado' });
    }
    await servicioModel.actualizar(req.params.id, { nombre, precio, descripcion });
    res.json({ mensaje: 'Servicio actualizado correctamente' });
  } catch (error) {
    respuestaError(res, error);
  } 
}

async function eliminar(req, res) {
  try {
    const servicio = await servicioModel.obtenerPorId(req.params.id);
    if (!servicio) {
      return res.status(404).json({ mensaje: 'Servicio no encontrado' });
    }
    await servicioModel.eliminar(req.params.id);
    res.json({ mensaje: 'Servicio eliminado correctamente' });
  } catch (error) {
    if (error.codigoNegocio === 'EN_USO') {
      return res.status(409).json({ mensaje: error.message });
    }
    respuestaError(res, error);
  }
}

module.exports = { listar, crear, actualizar, eliminar };