const mysql = require('mysql2');
require('dotenv').config();

const opcionesConexion = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// TiDB Cloud (y la mayoría de bases de datos en la nube) exigen conexión cifrada.
// En tu MySQL local no hace falta, así que solo se activa si DB_SSL=true en el .env
if (process.env.DB_SSL === 'true') {
  opcionesConexion.ssl = { minVersion: 'TLSv1.2' };
}

const pool = mysql.createPool(opcionesConexion);
const promisePool = pool.promise();

module.exports = promisePool;