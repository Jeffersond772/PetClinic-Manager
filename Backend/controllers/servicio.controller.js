const servicioModel = require('../models/servicio.model');

async function listar(req, res) {
  try {
    const servicios = await servicioModel.listar();
    res.json(servicios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
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
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
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
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

module.exports = { listar, crear, actualizar };