const movimientoModel = require('../models/movimiento.model');
const { respuestaError } = require('../utils/manejarError');

// CU06: registrar entrada de inventario
async function registrarEntrada(req, res) {
  const { id_producto, cantidad, costo_unitario, motivo } = req.body;

  if (!id_producto || !cantidad || Number(cantidad) <= 0) {
    return res.status(400).json({ mensaje: 'Producto y cantidad (mayor a 0) son obligatorios' });
  }

  try {
    const id_movimiento = await movimientoModel.registrarEntrada({
      id_producto,
      cantidad,
      costo_unitario,
      motivo: motivo || 'compra',
      id_usuario: req.usuario.id_usuario
    });

    res.status(201).json({ mensaje: 'Entrada registrada y stock actualizado', id_movimiento });

  } catch (error) {
    if (error.codigoNegocio === 'PRODUCTO_NO_EXISTE') {
      return res.status(404).json({ mensaje: error.message });
    }
    respuestaError(res, error);
  }
}

// CU10: registrar salida de inventario
async function registrarSalida(req, res) {
  const { id_producto, cantidad, motivo } = req.body;

  if (!id_producto || !cantidad || Number(cantidad) <= 0) {
    return res.status(400).json({ mensaje: 'Producto y cantidad (mayor a 0) son obligatorios' });
  }

  try {
    const id_movimiento = await movimientoModel.registrarSalida({
      id_producto,
      cantidad,
      motivo: motivo || 'venta',
      id_usuario: req.usuario.id_usuario
    });

    res.status(201).json({ mensaje: 'Salida registrada y stock actualizado', id_movimiento });

  } catch (error) {
    // Flujo alternativo CU10: stock insuficiente
    if (error.codigoNegocio === 'STOCK_INSUFICIENTE') {
      return res.status(409).json({ mensaje: error.message });
    }
    if (error.codigoNegocio === 'PRODUCTO_NO_EXISTE') {
      return res.status(404).json({ mensaje: error.message });
    }
    respuestaError(res, error);
  }
}

// RF31: historial de un producto específico
async function historialPorProducto(req, res) {
  try {
    const movimientos = await movimientoModel.listarPorProducto(req.params.idProducto);
    res.json(movimientos);
  } catch (error) {
    respuestaError(res, error);
  }
}

// Historial general
async function historialGeneral(req, res) {
  try {
    const movimientos = await movimientoModel.listarTodos();
    res.json(movimientos);
  } catch (error) {
    respuestaError(res, error);
  }
}

module.exports = { registrarEntrada, registrarSalida, historialPorProducto, historialGeneral };