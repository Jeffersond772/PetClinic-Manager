const tablaProveedores = document.getElementById('tablaProveedores');
const modalProveedor = document.getElementById('modalProveedor');
const formProveedor = document.getElementById('formProveedor');
const tituloModalProveedor = document.getElementById('tituloModalProveedor');
const mensajeErrorProveedor = document.getElementById('mensajeErrorProveedor');

let proveedores = [];

async function cargarProveedores() {
  mostrarCargando(tablaProveedores, 5);
  try {
    const respuesta = await fetch(`${API_URL}/api/proveedores`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (respuesta.status === 401 || respuesta.status === 403) {
      window.location.href = 'index.html';
      return;
    }

    proveedores = await respuesta.json();
    pintarTabla(proveedores);

  } catch (error) {
    console.error(error);
    tablaProveedores.innerHTML = `<tr><td colspan="5" class="tabla-vacia">No se pudo conectar con el servidor</td></tr>`;
  }
}

function pintarTabla(lista) {
  if (lista.length === 0) {
    tablaProveedores.innerHTML = `<tr><td colspan="5" class="tabla-vacia">No hay proveedores registrados</td></tr>`;
    return;
  }

  tablaProveedores.innerHTML = lista.map(p => `
    <tr>
      <td>${escaparHTML(p.nombre)}</td>
      <td>${escaparHTML(p.contacto) || '-'}</td>
      <td>${escaparHTML(p.telefono) || '-'}</td>
      <td>${escaparHTML(p.correo) || '-'}</td>
      <td><button class="btn-icono" onclick="editarProveedor(${p.id_proveedor})">Editar</button></td>
    </tr>
  `).join('');
}

document.getElementById('btnNuevoProveedor').addEventListener('click', () => {
  formProveedor.reset();
  document.getElementById('idProveedor').value = '';
  tituloModalProveedor.textContent = 'Nuevo proveedor';
  mensajeErrorProveedor.textContent = '';
  modalProveedor.classList.remove('oculto');
});

function editarProveedor(id_proveedor) {
  const proveedor = proveedores.find(p => p.id_proveedor === id_proveedor);
  if (!proveedor) return;

  document.getElementById('idProveedor').value = proveedor.id_proveedor;
  document.getElementById('nombreProveedor').value = proveedor.nombre;
  document.getElementById('contactoProveedor').value = proveedor.contacto || '';
  document.getElementById('telefonoProveedor').value = proveedor.telefono || '';
  document.getElementById('correoProveedor').value = proveedor.correo || '';
  document.getElementById('direccionProveedor').value = proveedor.direccion || '';

  tituloModalProveedor.textContent = 'Editar proveedor';
  mensajeErrorProveedor.textContent = '';
  modalProveedor.classList.remove('oculto');
}

document.getElementById('btnCancelarProveedor').addEventListener('click', () => {
  modalProveedor.classList.add('oculto');
});

formProveedor.addEventListener('submit', async (e) => {
  e.preventDefault();
  mensajeErrorProveedor.textContent = '';

  const id_proveedor = document.getElementById('idProveedor').value;
  const datos = {
    nombre: document.getElementById('nombreProveedor').value,
    contacto: document.getElementById('contactoProveedor').value || null,
    telefono: document.getElementById('telefonoProveedor').value || null,
    correo: document.getElementById('correoProveedor').value || null,
    direccion: document.getElementById('direccionProveedor').value || null
  };

  const esEdicion = id_proveedor !== '';
  const url = esEdicion ? `${API_URL}/api/proveedores/${id_proveedor}` : `${API_URL}/api/proveedores`;
  const metodo = esEdicion ? 'PUT' : 'POST';

  try {
    const respuesta = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(datos)
    });
    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      mensajeErrorProveedor.textContent = resultado.mensaje || 'Ocurrió un error al guardar';
      return;
    }

    modalProveedor.classList.add('oculto');
    cargarProveedores();

  } catch (error) {
    mensajeErrorProveedor.textContent = 'No se pudo conectar con el servidor';
  }
});

cargarProveedores();