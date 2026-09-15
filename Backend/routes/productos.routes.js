const express = require('express');
const router = express.Router();
const productoController = require('../controllers/producto.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Lectura: cualquier rol autenticado (el veterinario necesita ver el catálogo para formular tratamientos)
router.get('/buscar', verificarToken, productoController.buscar);
router.get('/bajo-stock', verificarToken, productoController.bajoStock);
router.get('/proximos-a-vencer', verificarToken, productoController.proximosAVencer);
router.get('/', verificarToken, productoController.listar);
router.get('/:id', verificarToken, productoController.obtener);

// Crear y actualizar: solo Administrador (según tu documento, CU04 y CU05)
router.post('/', verificarToken, verificarRol(['Administrador']), productoController.crear);
router.put('/:id', verificarToken, verificarRol(['Administrador']), productoController.actualizar);

module.exports = router;