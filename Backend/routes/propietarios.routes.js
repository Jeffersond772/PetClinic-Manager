const express = require('express');
const router = express.Router();
const propietarioController = require('../controllers/propietario.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Todos los roles autenticados pueden ver y buscar propietarios
router.get('/buscar', verificarToken, propietarioController.buscar);
router.get('/', verificarToken, propietarioController.listar);
router.get('/:id', verificarToken, propietarioController.obtener);

// Crear y actualizar: Administrador y Empleado (según la funcionalidad del documento)
router.post('/', verificarToken, verificarRol(['Administrador', 'Empleado']), propietarioController.crear);
router.put('/:id', verificarToken, verificarRol(['Administrador', 'Empleado']), propietarioController.actualizar);

module.exports = router;