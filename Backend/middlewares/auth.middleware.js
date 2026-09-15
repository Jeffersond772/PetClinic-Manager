const jwt = require('jsonwebtoken');

// Verifica que el usuario haya iniciado sesión (token válido)
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ mensaje: 'No se proporcionó un token de acceso' });
  }

  // El header viene como: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ mensaje: 'Formato de token inválido' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload; // { id_usuario, nombre, rol } quedan disponibles en las siguientes funciones
    next();
  } catch (error) {
    return res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
}

// Verifica que el usuario tenga uno de los roles permitidos
// Uso: verificarRol(['Administrador'])  o  verificarRol(['Administrador', 'Veterinario'])
function verificarRol(rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ mensaje: 'No autenticado' });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      // CU22: el sistema deniega el acceso a funciones no permitidas para el rol
      return res.status(403).json({ mensaje: 'No tienes permisos para realizar esta acción' });
    }

    next();
  };
}

module.exports = { verificarToken, verificarRol };