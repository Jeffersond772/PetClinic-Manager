// Convierte cualquier texto a una versión segura para insertar con innerHTML
function escaparHTML(texto) {
  if (texto === null || texto === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(texto);
  return div.innerHTML;
}

// ---- Seguridad: valida si el token JWT ya expiró (revisa el campo "exp") ----
function tokenEstaExpirado(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

// Protección de todas las páginas internas: si no hay sesión o expiró, fuera
const token = localStorage.getItem('token');
const usuarioGuardado = localStorage.getItem('usuario');

if (!token || !usuarioGuardado || tokenEstaExpirado(token)) {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.replace('index.html');
}

const usuario = usuarioGuardado ? JSON.parse(usuarioGuardado) : {};

// ---- Seguridad: si el navegador restaura esta página desde su caché
// (botón Atrás/Adelante tras cerrar sesión), revalida la sesión al instante ----
window.addEventListener('pageshow', function (event) {
  const tokenActual = localStorage.getItem('token');
  if (event.persisted && (!tokenActual || tokenEstaExpirado(tokenActual))) {
    window.location.replace('index.html');
  }
});

// ---- Cierra la sesión sola si el token expira mientras el usuario navega ----
setInterval(() => {
  const tokenActual = localStorage.getItem('token');
  if (tokenActual && tokenEstaExpirado(tokenActual)) {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.replace('index.html');
  }
}, 60000);

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
    { texto: 'Proveedores', href: 'proveedores.html' },
    { texto: 'Compras', href: 'compras.html' },
    { texto: 'Servicios', href: 'servicios.html' },
    { texto: 'Citas', href: 'citas.html' },
    { texto: 'Ventas', href: 'cuentas.html' },
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
    { texto: 'Ventas', href: 'cuentas.html' },
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

// ---- Resaltar la página activa en el menú ----
if (elSidebar) {
  const paginaActual = window.location.pathname.split('/').pop();
  elSidebar.querySelectorAll('a').forEach(link => {
    if (link.getAttribute('href') === paginaActual) {
      link.classList.add('activo');
    }
  });
}

// ---- Favicon (se inyecta en todas las páginas sin tocar cada HTML) ----
const favicon = document.createElement('link');
favicon.rel = 'icon';
favicon.href = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%231d9e75"/></svg>';
document.head.appendChild(favicon);

// ---- Logo/título clickeable → Dashboard ----
const tituloTopbar = document.querySelector('.topbar h1');
if (tituloTopbar) {
  tituloTopbar.style.cursor = 'pointer';
  tituloTopbar.addEventListener('click', () => {
    window.location.href = 'dashboard.html';
  });
}

if (elBtnLogout) {
  elBtnLogout.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
     window.location.replace('index.html');
  });
}

// ---- Modal de confirmación/alerta reutilizable ----
const modalConfirmHTML = `
  <div id="modalConfirmGlobal" class="modal-overlay oculto">
    <div class="modal-caja modal-confirm">
      <p id="mensajeConfirmGlobal"></p>
      <div class="modal-botones" id="botonesConfirmGlobal"></div>
    </div>
  </div>
`;
document.body.insertAdjacentHTML('beforeend', modalConfirmHTML);

const modalConfirmGlobal = document.getElementById('modalConfirmGlobal');
const mensajeConfirmGlobal = document.getElementById('mensajeConfirmGlobal');
const botonesConfirmGlobal = document.getElementById('botonesConfirmGlobal');

// Reemplaza confirm() nativo. Uso: const ok = await confirmarAccion('¿Seguro?');
function confirmarAccion(mensaje) {
  return new Promise(resolve => {
    mensajeConfirmGlobal.textContent = mensaje;
    botonesConfirmGlobal.innerHTML = `
      <button type="button" class="btn-secundario" id="btnConfirmNo">Cancelar</button>
      <button type="button" class="btn-primario" id="btnConfirmSi">Confirmar</button>
    `;
    modalConfirmGlobal.classList.remove('oculto');

    document.getElementById('btnConfirmSi').onclick = () => {
      modalConfirmGlobal.classList.add('oculto');
      resolve(true);
    };
    document.getElementById('btnConfirmNo').onclick = () => {
      modalConfirmGlobal.classList.add('oculto');
      resolve(false);
    };
  });
}

// Reemplaza alert() nativo. Uso: mostrarAlerta('Algo pasó');
function mostrarAlerta(mensaje) {
  mensajeConfirmGlobal.textContent = mensaje;
  botonesConfirmGlobal.innerHTML = `<button type="button" class="btn-primario" id="btnAlertaOk">Entendido</button>`;
  modalConfirmGlobal.classList.remove('oculto');
  document.getElementById('btnAlertaOk').onclick = () => modalConfirmGlobal.classList.add('oculto');
}

// Muestra una fila de "cargando" con spinner mientras llega la respuesta del servidor
function mostrarCargando(elementoTbody, columnas) {
  elementoTbody.innerHTML = `<tr><td colspan="${columnas}" class="tabla-cargando"><span class="spinner"></span> Cargando...</td></tr>`;
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