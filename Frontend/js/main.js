const loginForm = document.getElementById('loginForm');
const mensajeError = document.getElementById('mensajeError');
const btnLogin = document.getElementById('btnLogin');
const togglePassword = document.getElementById('togglePassword');
const campoPassword = document.getElementById('password');
const btnModoOscuroLogin = document.getElementById('btnModoOscuroLogin');

// ---- Mostrar/ocultar contraseña ----
if (togglePassword) {
  togglePassword.addEventListener('click', () => {
    const visible = campoPassword.type === 'text';
    campoPassword.type = visible ? 'password' : 'text';
    togglePassword.textContent = visible ? '👁️' : '🙈';
  });
}

// ---- Modo oscuro (toggle propio del login) ----
if (btnModoOscuroLogin) {
  btnModoOscuroLogin.textContent = document.body.classList.contains('modo-oscuro') ? '☀️' : '🌙';
  btnModoOscuroLogin.addEventListener('click', () => {
    document.body.classList.toggle('modo-oscuro');
    const activo = document.body.classList.contains('modo-oscuro');
    localStorage.setItem('modoOscuro', activo ? '1' : '0');
    btnModoOscuroLogin.textContent = activo ? '☀️' : '🌙';
  });
}

// ---- Si ya hay una sesión activa y válida, no mostrar el login ----
function tokenEstaExpirado(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

function verificarSesionExistente() {
  const token = localStorage.getItem('token');
  if (token && !tokenEstaExpirado(token)) {
    window.location.replace('dashboard.html');
  }
}

verificarSesionExistente();
window.addEventListener('pageshow', verificarSesionExistente);

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const correo = document.getElementById('correo').value;
  const password = document.getElementById('password').value;

  mensajeError.textContent = '';
  mensajeError.classList.remove('sacudir');

  const textoOriginalBoton = btnLogin.textContent;
  btnLogin.disabled = true;
  btnLogin.classList.add('cargando');
  btnLogin.innerHTML = '<span class="spinner spinner-boton"></span> Conectando...';

  try {
    const respuesta = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, password })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      mensajeError.textContent = datos.mensaje || 'Correo o contraseña incorrectos';
      mensajeError.classList.add('sacudir');
      btnLogin.disabled = false;
      btnLogin.classList.remove('cargando');
      btnLogin.textContent = textoOriginalBoton;
      return;
    }

    localStorage.setItem('token', datos.token);
    localStorage.setItem('usuario', JSON.stringify(datos.usuario));

    btnLogin.textContent = '¡Listo! Entrando...';
    window.location.replace('dashboard.html');

  } catch (error) {
    mensajeError.textContent = 'No se pudo conectar con el servidor';
    mensajeError.classList.add('sacudir');
    btnLogin.disabled = false;
    btnLogin.classList.remove('cargando');
    btnLogin.textContent = textoOriginalBoton;
    console.error(error);
  }
});