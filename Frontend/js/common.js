const API_URL = 'http://localhost:3000';

// Protección de todas las páginas internas: si no hay sesión, fuera
const token = localStorage.getItem('token');
const usuarioGuardado = localStorage.getItem('usuario');

if (!token || !usuarioGuardado) {
  window.location.href = 'index.html';
}

const usuario = JSON.parse(usuarioGuardado);

// ---- Elementos comunes del layout (pueden no existir en todas las páginas) ----
const elNombreUsuario = document.getElementById('nombreUsuario');
const elRolUsuario = document.getElementById('rolUsuario');
const elSidebar = document.getElementById('sidebarMenu');
const elBtnLogout = document.getElementById('btnLogout');

if (elNombreUsuario) elNombreUsuario.textContent = usuario.nombre;
if (elRolUsuario) elRolUsuario.textContent = usuario.rol;

// ---- Menú lateral según el rol (CU22) ----
const menusPorRol = {
  Administrador: [
    { texto: 'Usuarios', href: 'usuarios.html' },
    { texto: 'Propietarios', href: 'propietarios.html' },
    { texto: 'Pacientes', href: 'pacientes.html' },
    { texto: 'Inventario', href: 'productos.html' },
    { texto: 'Servicios', href: 'servicios.html' },
    { texto: 'Citas', href: 'citas.html' },
    { texto: 'Pagos y facturación', href: 'cuentas.html' },
{ texto: 'Gastos', href: 'gastos.html' },  // solo en el menú de Administrador
    { texto: 'Reportes', href: 'reportes.html' }
  ],
  Veterinario: [
    { texto: 'Pacientes', href: 'pacientes.html' },
    { texto: 'Citas', href: 'citas.html' },
  ],
  Empleado: [
    { texto: 'Propietarios', href: 'propietarios.html' },
    { texto: 'Pacientes', href: 'pacientes.html' },
    { texto: 'Citas', href: 'citas.html' },
    { texto: 'Pagos y facturación', href: 'cuentas.html' }
  ]
};

if (elSidebar) {
  const opciones = menusPorRol[usuario.rol] || [];
  opciones.forEach(opcion => {
    const link = document.createElement('a');
    link.href = opcion.href;
    link.textContent = opcion.texto;
    elSidebar.appendChild(link);
  });
}

if (elBtnLogout) {
  elBtnLogout.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = 'index.html';
  });
}

// ---- Modo oscuro ----
const modoGuardado = localStorage.getItem('modoOscuro');
if (modoGuardado === '1') {
  document.body.classList.add('modo-oscuro');
}

const btnModo = document.createElement('button');
btnModo.id = 'btnModoOscuro';
btnModo.textContent = document.body.classList.contains('modo-oscuro') ? 'Modo claro' : 'Modo oscuro';
btnModo.addEventListener('click', () => {
  document.body.classList.toggle('modo-oscuro');
  const activo = document.body.classList.contains('modo-oscuro');
  localStorage.setItem('modoOscuro', activo ? '1' : '0');
  btnModo.textContent = activo ? 'Modo claro' : 'Modo oscuro';
});
document.body.appendChild(btnModo);