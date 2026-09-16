const tablaServicios = document.getElementById('tablaServicios');
const modalServicio = document.getElementById('modalServicio');
const formServicio = document.getElementById('formServicio');
const tituloModalServicio = document.getElementById('tituloModalServicio');
const mensajeErrorServicio = document.getElementById('mensajeErrorServicio');

let servicios = [];

async function cargarServicios() {
  try {
    const respuesta = await fetch(`${API_URL}/api/servicios`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (respuesta.status === 401 || respuesta.status === 403) {
      window.location.href = 'index.html';
      return;
    }

    servicios = await respuesta.json();
    pintarTabla(servicios);

  } catch (error) {
    console.error(error);
    tablaServicios.innerHTML = `<tr><td colspan="4" class="tabla-vacia">No se pudo conectar con el servidor</td></tr>`;
  }
}

function pintarTabla(lista) {
  if (lista.length === 0) {
    tablaServicios.innerHTML = `<tr><td colspan="4" class="tabla-vacia">No hay servicios registrados</td></tr>`;
    return;
  }

  tablaServicios.innerHTML = lista.map(s => `
    <tr>
      <td>${s.nombre}</td>
      <td>$${Number(s.precio).toLocaleString()}</td>
      <td>${s.descripcion || '-'}</td>
      <td><button class="btn-icono" onclick="editarServicio(${s.id_servicio})">Editar</button></td>
    </tr>
  `).join('');
}

document.getElementById('btnNuevoServicio').addEventListener('click', () => {
  formServicio.reset();
  document.getElementById('idServicio').value = '';
  tituloModalServicio.textContent = 'Nuevo servicio';
  mensajeErrorServicio.textContent = '';
  modalServicio.classList.remove('oculto');
});

function editarServicio(id_servicio) {
  const servicio = servicios.find(s => s.id_servicio === id_servicio);
  if (!servicio) return;

  document.getElementById('idServicio').value = servicio.id_servicio;
  document.getElementById('nombreServicio').value = servicio.nombre;
  document.getElementById('precioServicio').value = servicio.precio;
  document.getElementById('descripcionServicio').value = servicio.descripcion || '';

  tituloModalServicio.textContent = 'Editar servicio';
  mensajeErrorServicio.textContent = '';
  modalServicio.classList.remove('oculto');
}

document.getElementById('btnCancelarServicio').addEventListener('click', () => {
  modalServicio.classList.add('oculto');
});

formServicio.addEventListener('submit', async (e) => {
  e.preventDefault();
  mensajeErrorServicio.textContent = '';

  const id_servicio = document.getElementById('idServicio').value;
  const datos = {
    nombre: document.getElementById('nombreServicio').value,
    precio: document.getElementById('precioServicio').value,
    descripcion: document.getElementById('descripcionServicio').value || null
  };

  const esEdicion = id_servicio !== '';
  const url = esEdicion ? `${API_URL}/api/servicios/${id_servicio}` : `${API_URL}/api/servicios`;
  const metodo = esEdicion ? 'PUT' : 'POST';

  try {
    const respuesta = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(datos)
    });
    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      mensajeErrorServicio.textContent = resultado.mensaje || 'Ocurrió un error al guardar';
      return;
    }

    modalServicio.classList.add('oculto');
    cargarServicios();

  } catch (error) {
    mensajeErrorServicio.textContent = 'No se pudo conectar con el servidor';
  }
});

cargarServicios();