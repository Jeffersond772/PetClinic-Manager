const proveedorModel = require('../models/proveedor.model');
const { respuestaError } = require('../utils/manejarError');

async function listar(req, res) {
  try {
    res.json(await proveedorModel.listar());
  } catch (error) {
    respuestaError(res, error);
  }
}

async function crear(req, res) {
  const { nombre, contacto, telefono, correo, direccion } = req.body;
  if (!nombre) {
    return res.status(400).json({ mensaje: 'El nombre del proveedor es obligatorio' });
  }
  try {
    const id_proveedor = await proveedorModel.crear({ nombre, contacto, telefono, correo, direccion });
    res.status(201).json({ mensaje: 'Proveedor registrado correctamente', id_proveedor });
  } catch (error) {
    respuestaError(res, error);
  }
}

async function actualizar(req, res) {
  const { nombre, contacto, telefono, correo, direccion } = req.body;
  if (!nombre) {
    return res.status(400).json({ mensaje: 'El nombre del proveedor es obligatorio' });
  }
  try {
    const proveedor = await proveedorModel.obtenerPorId(req.params.id);
    if (!proveedor) {
      return res.status(404).json({ mensaje: 'Proveedor no encontrado' });
    }
    await proveedorModel.actualizar(req.params.id, { nombre, contacto, telefono, correo, direccion });
    res.json({ mensaje: 'Proveedor actualizado correctamente' });
  } catch (error) {
    respuestaError(res, error);
  }
}

module.exports = { listar, crear, actualizar };