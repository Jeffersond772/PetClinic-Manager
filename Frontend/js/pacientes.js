const tablaPacientes = document.getElementById('tablaPacientes');
const inputBuscar = document.getElementById('inputBuscar');
const modal = document.getElementById('modalPaciente');
const formPaciente = document.getElementById('formPaciente');
const tituloModal = document.getElementById('tituloModal');
const mensajeErrorModal = document.getElementById('mensajeErrorModal');
const tituloSeccion = document.getElementById('tituloSeccion');

const inputEspecie = document.getElementById('especie');
const selectRaza = document.getElementById('raza');
const inputPropietarioTexto = document.getElementById('propietarioTexto');
const inputPropietarioId = document.getElementById('idPropietarioSeleccionado');
const resultadosPropietario = document.getElementById('resultadosPropietario');

let pacientes = [];

// Si venimos desde "Ver mascotas" de un propietario, la URL trae ?id_propietario=X
const parametros = new URLSearchParams(window.location.search);
const idPropietarioFiltro = parametros.get('id_propietario');

// ---- Cargar especies para el <select> ----
async function cargarEspecies() {
  const respuesta = await fetch(`${API_URL}/api/catalogos/especies`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const especies = await respuesta.json();
  inputEspecie.innerHTML = '<option value="">Selecciona una especie</option>' +
    especies.map(e => `<option value="${e.id_especie}">${e.nombre}</option>`).join('');
}

// ---- Cargar razas según la especie elegida ----
async function cargarRazas(id_especie) {
  if (!id_especie) {
    selectRaza.innerHTML = '<option value="">Selecciona una raza (opcional)</option>';
    return;
  }

  const respuesta = await fetch(`${API_URL}/api/catalogos/razas?id_especie=${id_especie}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const razas = await respuesta.json();
  selectRaza.innerHTML = '<option value="">Selecciona una raza (opcional)</option>' +
    razas.map(r => `<option value="${r.id_raza}">${r.nombre}</option>`).join('');
}

inputEspecie.addEventListener('change', () => cargarRazas(inputEspecie.value));

// ---- Cargar y pintar la tabla de pacientes ----
async function cargarPacientes() {
  mostrarCargando(tablaPacientes, 5);
  try {
    let url = `${API_URL}/api/pacientes`;
    if (idPropietarioFiltro) {
      url = `${API_URL}/api/pacientes/propietario/${idPropietarioFiltro}`;
      tituloSeccion.textContent = 'Mascotas del propietario';
    }

    const respuesta = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (respuesta.status === 401 || respuesta.status === 403) {
      window.location.href = 'index.html';
      return;
    }

    pacientes = await respuesta.json();
    pintarTabla(pacientes);

  } catch (error) {
    console.error('Error cargando pacientes:', error);
    tablaPacientes.innerHTML = `<tr><td colspan="5" class="tabla-vacia">No se pudo conectar con el servidor</td></tr>`;
  }
}

function pintarTabla(lista) {
  if (lista.length === 0) {
    tablaPacientes.innerHTML = `<tr><td colspan="5" class="tabla-vacia">No hay pacientes registrados</td></tr>`;
    return;
  }

  tablaPacientes.innerHTML = lista.map(p => `
    <tr>
      <td>${p.nombre}</td>
      <td>${p.especie}</td>
      <td>${p.raza || '-'}</td>
      <td>${p.propietario || '-'}</td>
      <td><button class="btn-icono" onclick="window.location.href='historia.html?id_paciente=${p.id_paciente}'">Ver historia</button>
<button class="btn-icono" onclick="editarPaciente(${p.id_paciente})">Editar</button></td>
    </tr>
  `).join('');
}

// ---- Buscador ----
let temporizadorBusqueda;
inputBuscar.addEventListener('input', () => {
  clearTimeout(temporizadorBusqueda);
  temporizadorBusqueda = setTimeout(async () => {
    const termino = inputBuscar.value.trim();

    if (termino === '') {
      cargarPacientes();
      return;
    }

    const respuesta = await fetch(`${API_URL}/api/pacientes/buscar?q=${encodeURIComponent(termino)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const resultados = await respuesta.json();
    pintarTabla(resultados);
  }, 350);
});

// ---- Autocompletar de propietario ----
let temporizadorAutocompletar;
inputPropietarioTexto.addEventListener('input', () => {
  inputPropietarioId.value = ''; // si el usuario vuelve a escribir, invalidamos la selección anterior
  clearTimeout(temporizadorAutocompletar);

  const termino = inputPropietarioTexto.value.trim();
  if (termino === '') {
    resultadosPropietario.classList.remove('visible');
    return;
  }

  temporizadorAutocompletar = setTimeout(async () => {
    const respuesta = await fetch(`${API_URL}/api/propietarios/buscar?q=${encodeURIComponent(termino)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const resultados = await respuesta.json();

    if (resultados.length === 0) {
      resultadosPropietario.innerHTML = `<div class="resultado-item">Sin coincidencias</div>`;
    } else {
      resultadosPropietario.innerHTML = resultados.map(p => `
        <div class="resultado-item" onclick="seleccionarPropietario(${p.id_propietario}, '${p.nombre.replace(/'/g, "\\'")}')">
          ${p.nombre}
          <small>${p.identificacion || 'Sin identificación'}</small>
        </div>
      `).join('');
    }

    resultadosPropietario.classList.add('visible');
  }, 300);
});

function seleccionarPropietario(id, nombre) {
  inputPropietarioId.value = id;
  inputPropietarioTexto.value = nombre;
  resultadosPropietario.classList.remove('visible');
}

// ---- Modal: abrir para crear ----
document.getElementById('btnNuevoPaciente').addEventListener('click', () => {
  formPaciente.reset();
  document.getElementById('idPaciente').value = '';
  inputPropietarioId.value = '';
  selectRaza.innerHTML = '<option value="">Selecciona una raza (opcional)</option>';
  tituloModal.textContent = 'Nuevo paciente';
  mensajeErrorModal.textContent = '';
  modal.classList.remove('oculto');
});

// ---- Modal: abrir para editar ----
async function editarPaciente(id_paciente) {
  const respuesta = await fetch(`${API_URL}/api/pacientes/${id_paciente}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const paciente = await respuesta.json();

  document.getElementById('idPaciente').value = paciente.id_paciente;
  document.getElementById('nombre').value = paciente.nombre || '';
  document.getElementById('sexo').value = paciente.sexo || 'desconocido';
  document.getElementById('fechaNacimiento').value = paciente.fecha_nacimiento ? paciente.fecha_nacimiento.split('T')[0] : '';
  document.getElementById('peso').value = paciente.peso || '';
  document.getElementById('caracteristicas').value = paciente.caracteristicas || '';

  inputPropietarioTexto.value = paciente.propietario || '';
  inputPropietarioId.value = paciente.id_propietario;

  inputEspecie.value = paciente.id_especie;
  await cargarRazas(paciente.id_especie);
  selectRaza.value = paciente.id_raza || '';

  tituloModal.textContent = 'Editar paciente';
  mensajeErrorModal.textContent = '';
  modal.classList.remove('oculto');
}

// ---- Modal: cerrar ----
document.getElementById('btnCancelarModal').addEventListener('click', () => {
  modal.classList.add('oculto');
});

// ---- Modal: guardar (crear o actualizar) ----
formPaciente.addEventListener('submit', async (e) => {
  e.preventDefault();
  mensajeErrorModal.textContent = '';

  const id_paciente = document.getElementById('idPaciente').value;
  const id_propietario = inputPropietarioId.value;

  if (!id_propietario) {
    mensajeErrorModal.textContent = 'Debes seleccionar un propietario de la lista';
    return;
  }

  const datos = {
    nombre: document.getElementById('nombre').value,
    id_especie: inputEspecie.value,
    id_raza: selectRaza.value || null,
    sexo: document.getElementById('sexo').value,
    fecha_nacimiento: document.getElementById('fechaNacimiento').value || null,
    peso: document.getElementById('peso').value || null,
    caracteristicas: document.getElementById('caracteristicas').value || null,
    id_propietario
  };

  const esEdicion = id_paciente !== '';
  const url = esEdicion ? `${API_URL}/api/pacientes/${id_paciente}` : `${API_URL}/api/pacientes`;
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
    cargarPacientes();

  } catch (error) {
    mensajeErrorModal.textContent = 'No se pudo conectar con el servidor';
    console.error(error);
  }
});

// ---- Carga inicial ----
cargarEspecies();
cargarPacientes();