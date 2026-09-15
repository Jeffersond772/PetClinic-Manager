const productoModel = require('../models/producto.model');

async function listar(req, res) {
  try {
    const productos = await productoModel.listar();
    res.json(productos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
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
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
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
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

// CU11 / CU19
async function bajoStock(req, res) {
  try {
    const productos = await productoModel.listarBajoStock();
    res.json(productos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

// CU19
async function proximosAVencer(req, res) {
  try {
    const productos = await productoModel.listarProximosAVencer();
    res.json(productos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

// CU04
async function crear(req, res) {
  const { nombre, id_categoria, id_proveedor, precio, unidad_medida, stock_minimo, fecha_vencimiento, descripcion } = req.body;

  if (!nombre || !id_categoria || precio === undefined) {
    return res.status(400).json({ mensaje: 'Nombre, categoría y precio son obligatorios' });
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
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

// CU05
async function actualizar(req, res) {
  const { nombre, id_categoria, id_proveedor, precio, unidad_medida, stock_minimo, fecha_vencimiento, descripcion } = req.body;

  if (!nombre || !id_categoria || precio === undefined) {
    return res.status(400).json({ mensaje: 'Nombre, categoría y precio son obligatorios' });
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
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

module.exports = { listar, obtener, buscar, bajoStock, proximosAVencer, crear, actualizar };