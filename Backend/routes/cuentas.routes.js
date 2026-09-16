const express = require('express');
const router = express.Router();
const cuentaController = require('../controllers/cuenta.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

router.get('/deudas', verificarToken, verificarRol(['Administrador']), cuentaController.deudas);
router.get('/', verificarToken, cuentaController.listar);
router.get('/:id', verificarToken, cuentaController.obtener);

// Crear cuenta y registrar pago: Empleado y Administrador (CU16)
router.post('/', verificarToken, verificarRol(['Administrador', 'Empleado']), cuentaController.crear);
router.post('/:id/pagos', verificarToken, verificarRol(['Administrador', 'Empleado']), cuentaController.registrarPago);

module.exports = router;