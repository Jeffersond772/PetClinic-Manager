const express = require('express');
const router = express.Router();
const historiaController = require('../controllers/historia.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Lectura: Veterinario y Administrador (Empleado no gestiona historias clínicas según tu documento)
router.get('/paciente/:idPaciente', verificarToken, verificarRol(['Veterinario', 'Administrador']), historiaController.obtenerHistoria);

// CU15: solo el Veterinario registra procedimientos preventivos
router.post('/procedimientos', verificarToken, verificarRol(['Veterinario']), historiaController.registrarProcedimiento);

module.exports = router;