const productoModel = require('../models/producto.model');
const { respuestaError } = require('../utils/manejarError');
const { obtenerFechaHoyLocal } = require('../utils/fecha');

async function listar(req, res) {
  try {
    const productos = await productoModel.listar();
    res.json(productos);
  } catch (error) {
    respuestaError(res, error);
  }
}

async function obtener(req, res) {
  try {
    const producto = await productoModel.obtenerPorId(req.params.id);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }
    res.json(producto);
  } catch (error) {
    respuestaError(res, error);
  }
}

async function buscar(req, res) {
  const termino = req.query.q;
  if (!termino) {
    return res.status(400).json({ mensaje: 'Debes enviar un término de búsqueda (?q=...)' });
  }
  try {
    const resultados = await productoModel.buscar(termino);
    res.json(resultados);
  } catch (error) {
    respuestaError(res, error);
  }
}

// CU11 / CU19
async function bajoStock(req, res) {
  try {
    const productos = await productoModel.listarBajoStock();
    res.json(productos);
  } catch (error) {
    respuestaError(res, error);
  }
  }


// CU19
async function proximosAVencer(req, res) {
  try {
    const productos = await productoModel.listarProximosAVencer();
    res.json(productos);
  } catch (error) {
    respuestaError(res, error);
  }
}

// CU04
async function crear(req, res) {
  const { nombre, id_categoria, id_proveedor, precio, unidad_medida, stock_minimo, fecha_vencimiento, descripcion } = req.body;

  if (!nombre || !id_categoria || precio === undefined) {
    return res.status(400).json({ mensaje: 'Nombre, categoría y precio son obligatorios' });
  }
    if (fecha_vencimiento) {
    const hoy = obtenerFechaHoyLocal();
    if (fecha_vencimiento < hoy) {
      return res.status(400).json({ mensaje: 'La fecha de vencimiento no puede ser anterior a hoy' });
    }
  }

  try {
    const id_producto = await productoModel.crear({
      nombre, id_categoria, id_proveedor, precio, unidad_medida, stock_minimo, fecha_vencimiento, descripcion
    });
    res.status(201).json({ mensaje: 'Producto registrado correctamente', id_producto });
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ mensaje: 'La categoría o el proveedor indicados no existen' });
    }
    respuestaError(res, error);
  }
}

// CU05
async function actualizar(req, res) {
  const { nombre, id_categoria, id_proveedor, precio, unidad_medida, stock_minimo, fecha_vencimiento, descripcion } = req.body;

  if (!nombre || !id_categoria || precio === undefined) {
    return res.status(400).json({ mensaje: 'Nombre, categoría y precio son obligatorios' });
  }

    if (fecha_vencimiento) {
    const hoy = obtenerFechaHoyLocal();
    if (fecha_vencimiento < hoy) {
      return res.status(400).json({ mensaje: 'La fecha de vencimiento no puede ser anterior a hoy' });
    }
  }

  try {
    const producto = await productoModel.obtenerPorId(req.params.id);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    await productoModel.actualizar(req.params.id, {
      nombre, id_categoria, id_proveedor, precio, unidad_medida, stock_minimo, fecha_vencimiento, descripcion
    });
    res.json({ mensaje: 'Producto actualizado correctamente' });
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ mensaje: 'La categoría o el proveedor indicados no existen' });
    }
    respuestaError(res, error);
  }

}

module.exports = { listar, obtener, buscar, bajoStock, proximosAVencer, crear, actualizar };