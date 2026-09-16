const cuentaModel = require('../models/cuenta.model');

async function listar(req, res) {
  try {
    const cuentas = await cuentaModel.listar();
    res.json(cuentas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

async function obtener(req, res) {
  try {
    const cuenta = await cuentaModel.obtenerPorId(req.params.id);
    if (!cuenta) {
      return res.status(404).json({ mensaje: 'Cuenta no encontrada' });
    }
    res.json(cuenta);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

// CU16
async function crear(req, res) {
  const { id_propietario, id_paciente, items } = req.body;

  if (!id_propietario || !items || items.length === 0) {
    return res.status(400).json({ mensaje: 'El propietario y al menos un producto o servicio son obligatorios' });
  }

  try {
    const resultado = await cuentaModel.crear({
      id_propietario,
      id_paciente,
      id_usuario: req.usuario.id_usuario,
      items
    });

    res.status(201).json({ mensaje: 'Cuenta registrada correctamente', ...resultado });

  } catch (error) {
    if (error.codigoNegocio === 'STOCK_INSUFICIENTE') {
      return res.status(409).json({ mensaje: error.message });
    }
    if (error.codigoNegocio === 'ITEM_NO_EXISTE') {
      return res.status(404).json({ mensaje: error.message });
    }
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

// CU16 (registrar pago)
async function registrarPago(req, res) {
  const { monto, metodo_pago } = req.body;

  if (!monto || Number(monto) <= 0 || !metodo_pago) {
    return res.status(400).json({ mensaje: 'El monto (mayor a 0) y el método de pago son obligatorios' });
  }

  try {
    const resultado = await cuentaModel.registrarPago({
      id_cuenta: req.params.id,
      monto,
      metodo_pago,
      id_usuario: req.usuario.id_usuario
    });

    res.status(201).json({ mensaje: 'Pago registrado correctamente', ...resultado });

  } catch (error) {
    if (error.codigoNegocio === 'CUENTA_NO_EXISTE') {
      return res.status(404).json({ mensaje: error.message });
    }
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

// CU18
async function deudas(req, res) {
  try {
    const resultado = await cuentaModel.listarDeudas();
    res.json(resultado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

module.exports = { listar, obtener, crear, registrarPago, deudas };