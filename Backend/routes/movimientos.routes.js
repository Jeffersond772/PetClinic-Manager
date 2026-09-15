const express = require('express');
const router = express.Router();
const movimientoController = require('../controllers/movimiento.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

router.get('/producto/:idProducto', verificarToken, movimientoController.historialPorProducto);
router.get('/', verificarToken, verificarRol(['Administrador']), movimientoController.historialGeneral);

// Entradas: solo Administrador (CU06)
router.post('/entrada', verificarToken, verificarRol(['Administrador']), movimientoController.registrarEntrada);

// Salidas: Administrador y Veterinario (CU10 — el veterinario también puede descontar por consulta)
router.post('/salida', verificarToken, verificarRol(['Administrador', 'Veterinario']), movimientoController.registrarSalida);

module.exports = router;