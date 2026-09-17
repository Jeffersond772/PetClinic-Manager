// Responde con un mensaje genérico al cliente, pero SIEMPRE registra el error real en la consola del servidor.
// En producción, nunca se envía error.message al cliente (podría revelar nombres de tablas, columnas, rutas del servidor).
function respuestaError(res, error, mensajePublico = 'Error en el servidor') {
  console.error(error);
  const esProduccion = process.env.NODE_ENV === 'production';
  const cuerpo = { mensaje: mensajePublico };
  if (!esProduccion) {
    cuerpo.error = error.message;
  }
  res.status(500).json(cuerpo);
}

module.exports = { respuestaError };