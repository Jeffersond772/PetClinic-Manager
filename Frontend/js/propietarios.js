const tablaPropietarios = document.getElementById('tablaPropietarios');
const inputBuscar = document.getElementById('inputBuscar');
const modal = document.getElementById('modalPropietario');
const formPropietario = document.getElementById('formPropietario');
const tituloModal = document.getElementById('tituloModal');
const mensajeErrorModal = document.getElementById('mensajeErrorModal');

let propietarios = []; // caché local de la última lista cargada

// ---- Cargar y pintar la tabla ----
async function cargarPropietarios() {
  try {
    const respuesta = await fetch(`${API_URL}/api/propietarios`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (respuesta.status === 401 || respuesta.status === 403) {
      window.location.href = 'index.html';
      return;
    }

    propietarios = await respuesta.json();
    pintarTabla(propietarios);

  } catch (error) {
    console.error('Error cargando propietarios:', error);
    tablaPropietarios.innerHTML = `<tr><td colspan="6" class="tabla-vacia">No se pudo conectar con el servidor</td></tr>`;
  }
}

function pintarTabla(lista) {
  if (lista.length === 0) {
    tablaPropietarios.innerHTML = `<tr><td colspan="6" class="tabla-vacia">No hay propietarios registrados</td></tr>`;
    return;
  }

  tablaPropietarios.innerHTML = lista.map(p => `
    <tr>
      <td>${p.nombre}</td>
      <td>${p.identificacion || '-'}</td>
      <td>${p.telefono || '-'}</td>
      <td>${p.correo || '-'}</td>
      <td><button class="btn-icono" onclick="verMascotas(${p.id_propietario})">Ver mascotas</button></td>
      <td><button class="btn-icono" onclick="editarPropietario(${p.id_propietario})">Editar</button></td>
    </tr>
  `).join('');
}

function verMascotas(id_propietario) {
  window.location.href = `pacientes.html?id_propietario=${id_propietario}`;
}

// ---- Buscador ----
let temporizadorBusqueda;
inputBuscar.addEventListener('input', () => {
  clearTimeout(temporizadorBusqueda);
  temporizadorBusqueda = setTimeout(async () => {
    const termino = inputBuscar.value.trim();

    if (termino === '') {
      cargarPropietarios();
      return;
    }

    try {
      const respuesta = await fetch(`${API_URL}/api/propietarios/buscar?q=${encodeURIComponent(termino)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resultados = await respuesta.json();
      pintarTabla(resultados);
    } catch (error) {
      console.error(error);
    }
  }, 350); // espera 350ms después de que el usuario deja de escribir
});

// ---- Modal: abrir para crear ----
document.getElementById('btnNuevoPropietario').addEventListener('click', () => {
  formPropietario.reset();
  document.getElementById('idPropietario').value = '';
  tituloModal.textContent = 'Nuevo propietario';
  mensajeErrorModal.textContent = '';
  modal.classList.remove('oculto');
});

// ---- Modal: abrir para editar ----
function editarPropietario(id_propietario) {
  const propietario = propietarios.find(p => p.id_propietario === id_propietario);
  if (!propietario) return;

  document.getElementById('idPropietario').value = propietario.id_propietario;
  document.getElementById('nombre').value = propietario.nombre || '';
  document.getElementById('identificacion').value = propietario.identificacion || '';
  document.getElementById('telefono').value = propietario.telefono || '';
  document.getElementById('correo').value = propietario.correo || '';
  document.getElementById('direccion').value = propietario.direccion || '';

  tituloModal.textContent = 'Editar propietario';
  mensajeErrorModal.textContent = '';
  modal.classList.remove('oculto');
}

// ---- Modal: cerrar ----
document.getElementById('btnCancelarModal').addEventListener('click', () => {
  modal.classList.add('oculto');
});

// ---- Modal: guardar (crear o actualizar) ----
formPropietario.addEventListener('submit', async (e) => {
  e.preventDefault();
  mensajeErrorModal.textContent = '';

  const id_propietario = document.getElementById('idPropietario').value;
  const datos = {
    nombre: document.getElementById('nombre').value,
    identificacion: document.getElementById('identificacion').value || null,
    telefono: document.getElementById('telefono').value || null,
    correo: document.getElementById('correo').value || null,
    direccion: document.getElementById('direccion').value || null
  };

  const esEdicion = id_propietario !== '';
  const url = esEdicion ? `${API_URL}/api/propietarios/${id_propietario}` : `${API_URL}/api/propietarios`;
  const metodo = esEdicion ? 'PUT' : 'POST';

  try {
    const respuesta = await fetch(url, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(datos)
    });

    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      mensajeErrorModal.textContent = resultado.mensaje || 'Ocurrió un error al guardar';
      return;
    }

    modal.classList.add('oculto');
    cargarPropietarios();

  } catch (error) {
    mensajeErrorModal.textContent = 'No se pudo conectar con el servidor';
    console.error(error);
  }
});

// ---- Carga inicial ----
cargarPropietarios();