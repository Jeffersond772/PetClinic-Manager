const express = require('express');
const router = express.Router();
const compraController = require('../controllers/compra.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

router.get('/', verificarToken, verificarRol(['Administrador']), compraController.listar);
router.get('/:id', verificarToken, verificarRol(['Administrador']), compraController.obtener);
router.post('/', verificarToken, verificarRol(['Administrador']), compraController.crear);

module.exports = router;