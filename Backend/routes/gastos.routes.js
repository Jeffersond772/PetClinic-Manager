const express = require('express');
const router = express.Router();
const gastoController = require('../controllers/gasto.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Gastos: solo Administrador (CU17, CU18)
router.get('/rango', verificarToken, verificarRol(['Administrador']), gastoController.porRango);
router.get('/', verificarToken, verificarRol(['Administrador']), gastoController.listar);
router.post('/', verificarToken, verificarRol(['Administrador']), gastoController.crear);

module.exports = router;