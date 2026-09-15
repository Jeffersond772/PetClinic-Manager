const express = require('express');
const router = express.Router();
const citaController = require('../controllers/cita.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Lectura: cualquier rol autenticado
router.get('/agenda', verificarToken, citaController.agenda);
router.get('/', verificarToken, citaController.listar);
router.get('/:id', verificarToken, citaController.obtener);

// Crear, modificar, cancelar: Empleado y Veterinario (según tu documento)
router.post('/', verificarToken, verificarRol(['Administrador', 'Empleado', 'Veterinario']), citaController.crear);
router.put('/:id', verificarToken, verificarRol(['Administrador', 'Empleado', 'Veterinario']), citaController.actualizar);
router.patch('/:id/cancelar', verificarToken, verificarRol(['Administrador', 'Empleado', 'Veterinario']), citaController.cancelar);
router.patch('/:id/estado', verificarToken, verificarRol(['Administrador', 'Empleado', 'Veterinario']), citaController.cambiarEstado);

module.exports = router;