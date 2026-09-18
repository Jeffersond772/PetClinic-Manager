const express = require('express');
const router = express.Router();
const proveedorController = require('../controllers/proveedor.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

router.get('/', verificarToken, proveedorController.listar);
router.post('/', verificarToken, verificarRol(['Administrador']), proveedorController.crear);
router.put('/:id', verificarToken, verificarRol(['Administrador']), proveedorController.actualizar);

module.exports = router;