const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const usuarioModel = require('../models/usuario.model');

async function login(req, res) {
  const { correo, password } = req.body;

  if (!correo || !password) {
    return res.status(400).json({ mensaje: 'Correo y contraseña son obligatorios' });
  }

  try {
    const usuario = await usuarioModel.obtenerPorCorreo(correo);

    // Flujo alternativo CU02: usuario no existe
    if (!usuario) {
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
    }

    // CU09: usuario desactivado no puede iniciar sesión
    if (usuario.estado === 'inactivo') {
      return res.status(403).json({ mensaje: 'Este usuario está desactivado. Contacta al administrador.' });
    }

    // Comparar la contraseña enviada con el hash guardado
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);

    // Flujo alternativo CU02: contraseña incorrecta
    if (!passwordValida) {
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
    }

    // Credenciales correctas: generamos el token
    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        rol: usuario.rol
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Postcondición CU02: el usuario accede con los permisos correspondientes a su rol
    res.json({
      mensaje: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

module.exports = { login };