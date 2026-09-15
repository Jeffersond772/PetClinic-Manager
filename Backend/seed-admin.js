require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('./config/db');

async function crearAdministrador() {
  const nombre = 'Administrador General';
  const correo = 'admin@petclinic.local';
  const passwordPlano = 'Admin2026!'; // cámbiala luego desde la app si quieres
  const id_rol = 1; // 1 = Administrador, según tu tabla roles

  try {
    // Verificamos que no exista ya
    const [existentes] = await db.query('SELECT id_usuario FROM usuarios WHERE correo = ?', [correo]);

    if (existentes.length > 0) {
      console.log('⚠️  Ya existe un usuario con ese correo. No se creó ninguno nuevo.');
      process.exit(0);
    }

    const password_hash = await bcrypt.hash(passwordPlano, 10);

    const [resultado] = await db.query(
      `INSERT INTO usuarios (nombre, correo, telefono, password_hash, id_rol, estado)
       VALUES (?, ?, ?, ?, ?, 'activo')`,
      [nombre, correo, null, password_hash, id_rol]
    );

    console.log('✅ Administrador creado con éxito');
    console.log('   ID:', resultado.insertId);
    console.log('   Correo:', correo);
    console.log('   Contraseña:', passwordPlano);
    console.log('   Guarda estos datos para iniciar sesión.');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error creando el administrador:', error.message);
    process.exit(1);
  }
}

crearAdministrador();