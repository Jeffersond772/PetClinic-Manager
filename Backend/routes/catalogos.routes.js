const express = require('express');
const router = express.Router();
const catalogoController = require('../controllers/catalogo.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Todos son solo lectura, para llenar <select> en los formularios del Frontend
router.get('/especies', verificarToken, catalogoController.especies);
router.get('/razas', verificarToken, catalogoController.razas);
router.get('/roles', verificarToken, catalogoController.roles);
router.get('/categorias-producto', verificarToken, catalogoController.categoriasProducto);
router.get('/veterinarios', verificarToken, catalogoController.veterinarios);

module.exports = router;