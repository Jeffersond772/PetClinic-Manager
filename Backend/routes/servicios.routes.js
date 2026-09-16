const express = require('express');
const router = express.Router();
const servicioController = require('../controllers/servicio.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Lectura: cualquier rol autenticado (el Empleado los necesita para facturar, CU16)
router.get('/', verificarToken, servicioController.listar);

// Crear y editar: solo Administrador (es parte de la "configuración" del negocio)
router.post('/', verificarToken, verificarRol(['Administrador']), servicioController.crear);
router.put('/:id', verificarToken, verificarRol(['Administrador']), servicioController.actualizar);

module.exports = router;