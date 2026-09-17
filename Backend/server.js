require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ mensaje: 'API de PetClinic Manager funcionando correctamente 🐾' });
});

app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT NOW() AS fecha_actual');
    res.json({ mensaje: 'Conexión exitosa a MySQL', resultado: rows });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error de conexión', error: error.message });
  }
});

const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos
  message: { mensaje: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Aquí montaremos las rutas de cada módulo más adelante:
app.use('/api/auth/login', limitadorLogin);
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/usuarios', require('./routes/usuarios.routes'));
app.use('/api/propietarios', require('./routes/propietarios.routes'));
app.use('/api/pacientes', require('./routes/pacientes.routes'));
app.use('/api/catalogos', require('./routes/catalogos.routes'));
app.use('/api/productos', require('./routes/productos.routes'));
app.use('/api/movimientos', require('./routes/movimientos.routes'));
app.use('/api/citas', require('./routes/citas.routes'));
app.use('/api/consultas', require('./routes/consultas.routes'));
app.use('/api/historias', require('./routes/historias.routes'));
app.use('/api/cuentas', require('./routes/cuentas.routes'));
app.use('/api/gastos', require('./routes/gastos.routes'));
app.use('/api/servicios', require('./routes/servicios.routes'));
app.use('/api/reportes', require('./routes/reportes.routes'));
const rateLimit = require('express-rate-limit');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API corriendo en http://localhost:${PORT}`);
});