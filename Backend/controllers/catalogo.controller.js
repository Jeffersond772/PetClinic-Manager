const catalogoModel = require('../models/catalogo.model');

async function especies(req, res) {
  try {
    const data = await catalogoModel.listarEspecies();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

// GET /api/catalogos/razas?id_especie=1  (id_especie es opcional)
async function razas(req, res) {
  try {
    const data = await catalogoModel.listarRazas(req.query.id_especie);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

async function roles(req, res) {
  try {
    const data = await catalogoModel.listarRoles();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

async function categoriasProducto(req, res) {
  try {
    const data = await catalogoModel.listarCategoriasProducto();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

async function veterinarios(req, res) {
  try {
    const data = await catalogoModel.listarVeterinarios();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

module.exports = { especies, razas, roles, categoriasProducto, veterinarios };