const loginForm = document.getElementById('loginForm');
const mensajeError = document.getElementById('mensajeError');

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
  e.preventDefault(); // evita que la página se recargue

  const correo = document.getElementById('correo').value;
  const password = document.getElementById('password').value;

  mensajeError.textContent = '';

  try {
    const respuesta = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, password })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      mensajeError.textContent = datos.mensaje || 'Correo o contraseña incorrectos';
      return;
    }

    localStorage.setItem('token', datos.token);
    localStorage.setItem('usuario', JSON.stringify(datos.usuario));

    window.location.replace('dashboard.html');

  } catch (error) {
    mensajeError.textContent = 'No se pudo conectar con el servidor';
    console.error(error);
  }
});