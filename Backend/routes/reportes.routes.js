const express = require('express');
const router = express.Router();
const reporteController = require('../controllers/reporte.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Todos requieren ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get('/resumen', verificarToken, reporteController.resumen);
router.get('/ingresos', verificarToken, verificarRol(['Administrador']), reporteController.ingresos);
router.get('/gastos', verificarToken, verificarRol(['Administrador']), reporteController.gastos);
router.get('/consultas', verificarToken, verificarRol(['Administrador', 'Veterinario']), reporteController.consultas);
router.get('/productos-movimiento', verificarToken, verificarRol(['Administrador']), reporteController.productosMovimiento);
router.get('/citas-estado', verificarToken, reporteController.citasEstado);

module.exports = router;