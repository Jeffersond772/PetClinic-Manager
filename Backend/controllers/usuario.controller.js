const bcrypt = require('bcrypt');
const usuarioModel = require('../models/usuario.model');

// CU01: Registro de usuario
async function crear(req, res) {
  const { nombre, correo, telefono, password, id_rol } = req.body;

  if (!nombre || !correo || !password || !id_rol) {
    return res.status(400).json({ mensaje: 'Nombre, correo, contraseña y rol son obligatorios' });
  }

  try {
    // Flujo alternativo CU01: el usuario ya existe
    const existente = await usuarioModel.obtenerPorCorreo(correo);
    if (existente) {
      return res.status(409).json({ mensaje: 'Ya existe un usuario registrado con ese correo' });
    }

    // Nunca guardamos la contraseña tal cual: la encriptamos
    const password_hash = await bcrypt.hash(password, 10);

    const id_usuario = await usuarioModel.crearUsuario({
      nombre, correo, telefono, password_hash, id_rol
    });

    res.status(201).json({
      mensaje: 'Usuario creado correctamente',
      id_usuario
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

// CU09: listar todos los usuarios
async function listar(req, res) {
  try {
    const usuarios = await usuarioModel.listarUsuarios();
    res.json(usuarios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

// CU09: consultar un usuario específico
async function obtener(req, res) {
  try {
    const usuario = await usuarioModel.obtenerPorId(req.params.id);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
    res.json(usuario);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

// CU03: actualizar usuario
async function actualizar(req, res) {
  const { nombre, correo, telefono, id_rol } = req.body;

  try {
    const usuario = await usuarioModel.obtenerPorId(req.params.id);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    await usuarioModel.actualizarUsuario(req.params.id, { nombre, correo, telefono, id_rol });
    res.json({ mensaje: 'Usuario actualizado correctamente' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

// CU09: desactivar (o reactivar) usuario
async function cambiarEstado(req, res) {
  const { estado } = req.body; // 'activo' o 'inactivo'

  if (!['activo', 'inactivo'].includes(estado)) {
    return res.status(400).json({ mensaje: "El estado debe ser 'activo' o 'inactivo'" });
  }

  try {
    const usuario = await usuarioModel.obtenerPorId(req.params.id);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    await usuarioModel.cambiarEstado(req.params.id, estado);
    res.json({ mensaje: `Usuario ${estado === 'activo' ? 'activado' : 'desactivado'} correctamente` });

  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
}

module.exports = { crear, listar, obtener, actualizar, cambiarEstado };