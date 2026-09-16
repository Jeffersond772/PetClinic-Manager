const tablaUsuarios = document.getElementById('tablaUsuarios');
const modalUsuario = document.getElementById('modalUsuario');
const formUsuario = document.getElementById('formUsuario');
const tituloModalUsuario = document.getElementById('tituloModalUsuario');
const mensajeErrorUsuario = document.getElementById('mensajeErrorUsuario');
const selectRol = document.getElementById('rolUsuarioSelect');
const grupoPassword = document.getElementById('grupoPassword');
const inputPassword = document.getElementById('passwordUsuario');

let usuarios = [];

async function cargarRoles() {
  const respuesta = await fetch(`${API_URL}/api/catalogos/roles`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const roles = await respuesta.json();
  selectRol.innerHTML = '<option value="">Selecciona un rol</option>' +
    roles.map(r => `<option value="${r.id_rol}">${r.nombre}</option>`).join('');
}

async function cargarUsuarios() {
  try {
    const respuesta = await fetch(`${API_URL}/api/usuarios`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (respuesta.status === 401 || respuesta.status === 403) {
      window.location.href = 'index.html';
      return;
    }

    usuarios = await respuesta.json();
    pintarTabla(usuarios);

  } catch (error) {
    console.error(error);
    tablaUsuarios.innerHTML = `<tr><td colspan="5" class="tabla-vacia">No se pudo conectar con el servidor</td></tr>`;
  }
}

function pintarTabla(lista) {
  if (lista.length === 0) {
    tablaUsuarios.innerHTML = `<tr><td colspan="5" class="tabla-vacia">No hay usuarios registrados</td></tr>`;
    return;
  }

  tablaUsuarios.innerHTML = lista.map(u => `
    <tr>
      <td>${u.nombre}</td>
      <td>${u.correo}</td>
      <td>${u.rol}</td>
      <td><span class="badge-estado badge-${u.estado === 'activo' ? 'atendida' : 'cancelada'}">${u.estado}</span></td>
      <td>
        <button class="btn-icono" onclick="editarUsuario(${u.id_usuario})">Editar</button>
        ${u.correo === usuario.correo ? '' : `
          <button class="btn-icono" onclick="cambiarEstadoUsuario(${u.id_usuario}, '${u.estado === 'activo' ? 'inactivo' : 'activo'}')">
            ${u.estado === 'activo' ? 'Desactivar' : 'Activar'}
          </button>
        `}
      </td>
    </tr>
  `).join('');
}

document.getElementById('btnNuevoUsuario').addEventListener('click', () => {
  formUsuario.reset();
  document.getElementById('idUsuario').value = '';
  tituloModalUsuario.textContent = 'Nuevo usuario';
  mensajeErrorUsuario.textContent = '';
  grupoPassword.style.display = 'block';
  inputPassword.required = true;
  modalUsuario.classList.remove('oculto');
});

async function editarUsuario(id_usuario) {
  const respuesta = await fetch(`${API_URL}/api/usuarios/${id_usuario}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const u = await respuesta.json();

  document.getElementById('idUsuario').value = u.id_usuario;
  document.getElementById('nombreUsuarioInput').value = u.nombre;
  document.getElementById('correoUsuario').value = u.correo;
  document.getElementById('telefonoUsuario').value = u.telefono || '';
  selectRol.value = u.id_rol;

  // En edición no se cambia la contraseña desde aquí (evita reescribirla sin querer)
  grupoPassword.style.display = 'none';
  inputPassword.required = false;

  tituloModalUsuario.textContent = 'Editar usuario';
  mensajeErrorUsuario.textContent = '';
  modalUsuario.classList.remove('oculto');
}

document.getElementById('btnCancelarUsuario').addEventListener('click', () => {
  modalUsuario.classList.add('oculto');
});

formUsuario.addEventListener('submit', async (e) => {
  e.preventDefault();
  mensajeErrorUsuario.textContent = '';

  const id_usuario = document.getElementById('idUsuario').value;
  const esEdicion = id_usuario !== '';

  const datos = {
    nombre: document.getElementById('nombreUsuarioInput').value,
    correo: document.getElementById('correoUsuario').value,
    telefono: document.getElementById('telefonoUsuario').value || null,
    id_rol: selectRol.value
  };

  if (!esEdicion) {
    datos.password = inputPassword.value;
  }

  const url = esEdicion ? `${API_URL}/api/usuarios/${id_usuario}` : `${API_URL}/api/usuarios`;
  const metodo = esEdicion ? 'PUT' : 'POST';

  try {
    const respuesta = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(datos)
    });
    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      mensajeErrorUsuario.textContent = resultado.mensaje || 'Ocurrió un error al guardar';
      return;
    }

    modalUsuario.classList.add('oculto');
    cargarUsuarios();

  } catch (error) {
    mensajeErrorUsuario.textContent = 'No se pudo conectar con el servidor';
  }
});

async function cambiarEstadoUsuario(id_usuario, nuevoEstado) {
  const accion = nuevoEstado === 'inactivo' ? 'desactivar' : 'activar';
  if (!confirm(`¿Confirmas que deseas ${accion} este usuario?`)) return;

  const respuesta = await fetch(`${API_URL}/api/usuarios/${id_usuario}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ estado: nuevoEstado })
  });

  if (!respuesta.ok) {
    const resultado = await respuesta.json();
    alert(resultado.mensaje || 'Ocurrió un error');
    return;
  }

  cargarUsuarios();
}

cargarRoles();
cargarUsuarios();