const compraModel = require('../models/compra.model');
const { respuestaError } = require('../utils/manejarError');

async function listar(req, res) {
  try {
    res.json(await compraModel.listar());
  } catch (error) {
    respuestaError(res, error);
  }
}

async function obtener(req, res) {
  try {
    const compra = await compraModel.obtenerPorId(req.params.id);
    if (!compra) {
      return res.status(404).json({ mensaje: 'Compra no encontrada' });
    }
    res.json(compra);
  } catch (error) {
    respuestaError(res, error);
  }
}

async function crear(req, res) {
  const { id_proveedor, items } = req.body;

  if (!id_proveedor || !items || items.length === 0) {
    return res.status(400).json({ mensaje: 'El proveedor y al menos un producto son obligatorios' });
  }

  try {
    const id_compra = await compraModel.crear({ id_proveedor, id_usuario: req.usuario.id_usuario, items });
    res.status(201).json({ mensaje: 'Compra registrada e inventario actualizado', id_compra });
  } catch (error) {
    if (error.codigoNegocio === 'ITEM_NO_EXISTE') {
      return res.status(404).json({ mensaje: error.message });
    }
    respuestaError(res, error);
  }
}

module.exports = { listar, obtener, crear };