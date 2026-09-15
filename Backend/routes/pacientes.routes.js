const express = require('express');
const router = express.Router();
const pacienteController = require('../controllers/paciente.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Lectura: cualquier rol autenticado
router.get('/buscar', verificarToken, pacienteController.buscar);
router.get('/propietario/:idPropietario', verificarToken, pacienteController.porPropietario);
router.get('/', verificarToken, pacienteController.listar);
router.get('/:id', verificarToken, pacienteController.obtener);

// Crear y actualizar: Administrador, Veterinario y Empleado (todos gestionan pacientes según tu documento)
router.post('/', verificarToken, verificarRol(['Administrador', 'Veterinario', 'Empleado']), pacienteController.crear);
router.put('/:id', verificarToken, verificarRol(['Administrador', 'Veterinario', 'Empleado']), pacienteController.actualizar);

module.exports = router;