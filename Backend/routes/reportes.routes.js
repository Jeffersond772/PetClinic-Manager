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
router.get('/ganancia', verificarToken, verificarRol(['Administrador']), reporteController.ganancia);
router.get('/rentabilidad', verificarToken, verificarRol(['Administrador']), reporteController.rentabilidad);
router.get('/compras-proveedor', verificarToken, verificarRol(['Administrador']), reporteController.comprasProveedor);
router.get('/ingresos-servicio', verificarToken, verificarRol(['Administrador']), reporteController.ingresosServicio);
router.get('/citas-veterinario', verificarToken, verificarRol(['Administrador']), reporteController.citasVeterinario);

module.exports = router;