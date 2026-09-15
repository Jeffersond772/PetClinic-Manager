const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Todas las rutas de este módulo requieren estar logueado Y ser Administrador
router.post('/', verificarToken, verificarRol(['Administrador']), usuarioController.crear);
router.get('/', verificarToken, verificarRol(['Administrador']), usuarioController.listar);
router.get('/:id', verificarToken, verificarRol(['Administrador']), usuarioController.obtener);
router.put('/:id', verificarToken, verificarRol(['Administrador']), usuarioController.actualizar);
router.patch('/:id/estado', verificarToken, verificarRol(['Administrador']), usuarioController.cambiarEstado);

module.exports = router;