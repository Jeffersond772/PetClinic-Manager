const express = require('express');
const router = express.Router();
const consultaController = require('../controllers/consulta.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

router.get('/paciente/:idPaciente', verificarToken, consultaController.listarPorPaciente);
router.get('/:id', verificarToken, consultaController.obtener);

// Solo el Veterinario registra consultas (CU08)
router.post('/', verificarToken, verificarRol(['Veterinario']), consultaController.crear);

module.exports = router;