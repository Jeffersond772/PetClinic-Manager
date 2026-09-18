const loginForm = document.getElementById('loginForm');
const mensajeError = document.getElementById('mensajeError');

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
      // El servidor respondió pero con error (ej. credenciales inválidas)
      mensajeError.textContent = datos.mensaje || 'Correo o contraseña incorrectos';
      return;
    }

    // Login exitoso: guardamos el token y los datos del usuario
    localStorage.setItem('token', datos.token);
    localStorage.setItem('usuario', JSON.stringify(datos.usuario));

    // Redirigimos al dashboard (lo crearemos más adelante)
    window.location.href = 'dashboard.html';

  } catch (error) {
    // Esto captura errores de red (ej. la API no está corriendo)
    mensajeError.textContent = 'No se pudo conectar con el servidor';
    console.error(error);
  }
});