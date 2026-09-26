document.getElementById('fechaCita').min = formatearFecha(new Date());
const tablaCitas = document.getElementById('tablaCitas');
const filtroDesde = document.getElementById('filtroDesde');
const filtroHasta = document.getElementById('filtroHasta');
const filtroVeterinario = document.getElementById('filtroVeterinario');

const modalCita = document.getElementById('modalCita');
const formCita = document.getElementById('formCita');
const tituloModalCita = document.getElementById('tituloModalCita');
const mensajeErrorCita = document.getElementById('mensajeErrorCita');

const inputPropietarioTexto = document.getElementById('propietarioTexto');
const inputPropietarioId = document.getElementById('idPropietarioSeleccionado');
const resultadosPropietario = document.getElementById('resultadosPropietario');
const selectPaciente = document.getElementById('paciente');
const selectVeterinario = document.getElementById('veterinario');

// ---- Utilidad: formatear fecha a YYYY-MM-DD ----
function formatearFecha(fecha) {
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}
// ---- Cargar veterinarios en los selects (filtro y modal) ----
let veterinariosCache = [];

async function cargarVeterinarios() {
  const respuesta = await fetch(`${API_URL}/api/catalogos/veterinarios`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  veterinariosCache = await respuesta.json();

  const opciones = veterinariosCache.map(v => `<option value="${v.id_usuario}">${v.nombre}</option>`).join('');
  filtroVeterinario.innerHTML = '<option value="">Todos</option>' + opciones;
  selectVeterinario.innerHTML = '<option value="">Selecciona un veterinario</option>' + opciones;

  document.getElementById('grupoForzarHorario').classList.toggle('oculto', usuario.rol !== 'Administrador');
}

selectVeterinario.addEventListener('change', () => {
  const vet = veterinariosCache.find(v => v.id_usuario == selectVeterinario.value);
  const hint = document.getElementById('horarioLaboralHint');
  hint.textContent = (vet && vet.hora_inicio_laboral && vet.hora_fin_laboral)
    ? `Horario laboral: ${vet.hora_inicio_laboral.slice(0,5)} - ${vet.hora_fin_laboral.slice(0,5)}`
    : '';
});

// ---- Cargar agenda según filtros ----
async function cargarAgenda() {
  const desde = filtroDesde.value;
  const hasta = filtroHasta.value;
  const idVet = filtroVeterinario.value;
  mostrarCargando(tablaCitas, 7);

  let url = `${API_URL}/api/citas/agenda?desde=${desde}&hasta=${hasta}`;
  if (idVet) url += `&id_veterinario=${idVet}`;

  try {
    const respuesta = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

    if (respuesta.status === 401 || respuesta.status === 403) {
      window.location.href = 'index.html';
      return;
    }

    const resultado = await respuesta.json();
    pintarTabla(resultado.citas);

  } catch (error) {
    console.error(error);
    tablaCitas.innerHTML = `<tr><td colspan="7" class="tabla-vacia">No se pudo conectar con el servidor</td></tr>`;
  }
}

function pintarTabla(citas) {
  if (citas.length === 0) {
    // Flujo alternativo CU13: no hay citas en el período
    tablaCitas.innerHTML = `<tr><td colspan="7" class="tabla-vacia">No existen citas programadas para el período seleccionado</td></tr>`;
    return;
  }

    tablaCitas.innerHTML = citas.map(c => `
    <tr>
      <td>${c.fecha.split('T')[0]}</td>
      <td>${c.hora}</td>
      <td>${escaparHTML(c.paciente)}</td>
      <td>${escaparHTML(c.propietario)}</td>
      <td>${escaparHTML(c.veterinario)}</td>
      <td><span class="badge-estado badge-${c.estado}">${c.estado.replace('_', ' ')}</span></td>
      <td>
        ${c.estado === 'programada' ? `
          <button class="btn-icono" onclick="editarCita(${c.id_cita})">Editar</button>
          <button class="btn-icono" onclick="marcarEstado(${c.id_cita}, 'atendida')">Atendida</button>
          <button class="btn-icono" onclick="marcarEstado(${c.id_cita}, 'no_asistio')">No asistió</button>
          <button class="btn-icono" onclick="cancelarCita(${c.id_cita})">Cancelar</button>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

// ---- Filtros rápidos ----
document.getElementById('btnHoy').addEventListener('click', () => {
  const hoy = formatearFecha(new Date());
  filtroDesde.value = hoy;
  filtroHasta.value = hoy;
  cargarAgenda();
});

document.getElementById('btnSemana').addEventListener('click', () => {
  const hoy = new Date();
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() - hoy.getDay());
  const finSemana = new Date(inicioSemana);
  finSemana.setDate(inicioSemana.getDate() + 6);

  filtroDesde.value = formatearFecha(inicioSemana);
  filtroHasta.value = formatearFecha(finSemana);
  cargarAgenda();
});

filtroDesde.addEventListener('change', cargarAgenda);
filtroHasta.addEventListener('change', cargarAgenda);
filtroVeterinario.addEventListener('change', cargarAgenda);

// ==================== AUTOCOMPLETAR PROPIETARIO ====================

let temporizadorAutocompletar;
inputPropietarioTexto.addEventListener('input', () => {
  inputPropietarioId.value = '';
  selectPaciente.innerHTML = '<option value="">Primero selecciona un propietario</option>';
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

      resultadosPropietario.innerHTML = resultados.length === 0
      ? `<div class="resultado-item">Sin coincidencias</div>`
      : resultados.map(p => `
          <div class="resultado-item" onclick="seleccionarPropietario(${p.id_propietario}, '${p.nombre.replace(/'/g, "\\'")}')">
            ${escaparHTML(p.nombre)}
            <small>${escaparHTML(p.identificacion) || 'Sin identificación'}</small>
          </div>
        `).join('');

    resultadosPropietario.classList.add('visible');
  }, 300);
});

async function seleccionarPropietario(id, nombre) {
  inputPropietarioId.value = id;
  inputPropietarioTexto.value = nombre;
  resultadosPropietario.classList.remove('visible');

  // Cargar las mascotas de este propietario en el <select> de paciente
  const respuesta = await fetch(`${API_URL}/api/pacientes/propietario/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const mascotas = await respuesta.json();

  selectPaciente.innerHTML = mascotas.length === 0
    ? '<option value="">Este propietario no tiene mascotas registradas</option>'
    : '<option value="">Selecciona una mascota</option>' +
      mascotas.map(m => `<option value="${m.id_paciente}">${m.nombre} (${m.especie})</option>`).join('');
}

// ==================== MODAL: CREAR / EDITAR CITA ====================

document.getElementById('btnNuevaCita').addEventListener('click', () => {
  formCita.reset();
  document.getElementById('idCita').value = '';
  document.getElementById('horarioLaboralHint').textContent = '';
  inputPropietarioId.value = '';
  selectPaciente.innerHTML = '<option value="">Primero selecciona un propietario</option>';
  tituloModalCita.textContent = 'Agendar cita';
  mensajeErrorCita.textContent = '';
  modalCita.classList.remove('oculto');
});

async function editarCita(id_cita) {
  const respuesta = await fetch(`${API_URL}/api/citas/${id_cita}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const cita = await respuesta.json();

  document.getElementById('idCita').value = cita.id_cita;
  document.getElementById('fechaCita').value = cita.fecha.split('T')[0];
  document.getElementById('horaCita').value = cita.hora;
  document.getElementById('motivoCita').value = cita.motivo || '';
  selectVeterinario.value = cita.id_veterinario;

  inputPropietarioTexto.value = cita.propietario;
  inputPropietarioId.value = cita.id_propietario;

  const respMascotas = await fetch(`${API_URL}/api/pacientes/propietario/${cita.id_propietario}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const mascotas = await respMascotas.json();
  selectPaciente.innerHTML = mascotas.map(m => `<option value="${m.id_paciente}">${m.nombre} (${m.especie})</option>`).join('');
  selectPaciente.value = cita.id_paciente;

  tituloModalCita.textContent = 'Editar cita';
  mensajeErrorCita.textContent = '';
  modalCita.classList.remove('oculto');
}

document.getElementById('btnCancelarModalCita').addEventListener('click', () => {
  modalCita.classList.add('oculto');
});

formCita.addEventListener('submit', async (e) => {
  e.preventDefault();
  mensajeErrorCita.textContent = '';

  const id_cita = document.getElementById('idCita').value;
  const id_propietario = inputPropietarioId.value;
  const id_paciente = selectPaciente.value;

  if (!id_propietario || !id_paciente) {
    mensajeErrorCita.textContent = 'Debes seleccionar un propietario y una mascota';
    return;
  }

  const datos = {
    id_paciente,
    id_propietario,
    id_veterinario: selectVeterinario.value,
    fecha: document.getElementById('fechaCita').value,
    hora: document.getElementById('horaCita').value,
    motivo: document.getElementById('motivoCita').value || null,
    forzar: document.getElementById('forzarHorario').checked
  };

  const esEdicion = id_cita !== '';
  const url = esEdicion ? `${API_URL}/api/citas/${id_cita}` : `${API_URL}/api/citas`;
  const metodo = esEdicion ? 'PUT' : 'POST';

  try {
    const respuesta = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(datos)
    });
    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      // Aquí llega, por ejemplo: "El horario seleccionado ya está ocupado para este veterinario"
      mensajeErrorCita.textContent = resultado.mensaje || 'Ocurrió un error al guardar';
      return;
    }

    modalCita.classList.add('oculto');
    cargarAgenda();

  } catch (error) {
    mensajeErrorCita.textContent = 'No se pudo conectar con el servidor';
  }
});

// ==================== ACCIONES RÁPIDAS ====================

async function cancelarCita(id_cita) {
  const ok = await confirmarAccion('¿Confirmas que deseas cancelar esta cita?');
  if (!ok) return;

  await fetch(`${API_URL}/api/citas/${id_cita}/cancelar`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  cargarAgenda();
}

async function marcarEstado(id_cita, estado) {
  await fetch(`${API_URL}/api/citas/${id_cita}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ estado })
  });
  cargarAgenda();
}

// ---- Carga inicial: mostrar la semana actual por defecto ----
document.getElementById('btnSemana').click();
cargarVeterinarios();

// ==================== VISTA CALENDARIO ====================

const vistaListaContainer = document.getElementById('vistaListaContainer');
const vistaCalendarioContainer = document.getElementById('vistaCalendarioContainer');
const btnVistaLista = document.getElementById('btnVistaLista');
const btnVistaCalendario = document.getElementById('btnVistaCalendario');
const tituloMesCalendario = document.getElementById('tituloMesCalendario');
const calendarioGrid = document.getElementById('calendarioGrid');

let mesCalendarioActual = new Date();

btnVistaLista.addEventListener('click', () => {
  vistaListaContainer.style.display = 'block';
  vistaCalendarioContainer.classList.add('oculto');
  btnVistaLista.classList.add('vista-activa');
  btnVistaCalendario.classList.remove('vista-activa');
});

btnVistaCalendario.addEventListener('click', () => {
  vistaListaContainer.style.display = 'none';
  vistaCalendarioContainer.classList.remove('oculto');
  btnVistaCalendario.classList.add('vista-activa');
  btnVistaLista.classList.remove('vista-activa');
  cargarCalendario();
});

document.getElementById('btnMesAnterior').addEventListener('click', () => {
  mesCalendarioActual.setMonth(mesCalendarioActual.getMonth() - 1);
  cargarCalendario();
});

document.getElementById('btnMesSiguiente').addEventListener('click', () => {
  mesCalendarioActual.setMonth(mesCalendarioActual.getMonth() + 1);
  cargarCalendario();
});

async function cargarCalendario() {
  const año = mesCalendarioActual.getFullYear();
  const mes = mesCalendarioActual.getMonth();

  const primerDiaMes = new Date(año, mes, 1);
  const ultimoDiaMes = new Date(año, mes + 1, 0);

  tituloMesCalendario.textContent = mesCalendarioActual.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

  const idVet = filtroVeterinario.value;
  let url = `${API_URL}/api/citas/agenda?desde=${formatearFecha(primerDiaMes)}&hasta=${formatearFecha(ultimoDiaMes)}`;
  if (idVet) url += `&id_veterinario=${idVet}`;

  const respuesta = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  const resultado = await respuesta.json();
  const citas = resultado.citas || [];

  const citasPorDia = {};
  citas.forEach(c => {
    const dia = c.fecha.split('T')[0];
    if (!citasPorDia[dia]) citasPorDia[dia] = [];
    citasPorDia[dia].push(c);
  });

  renderizarCalendario(primerDiaMes, ultimoDiaMes, citasPorDia);
}

function renderizarCalendario(primerDiaMes, ultimoDiaMes, citasPorDia) {
  const hoyStr = formatearFecha(new Date());
  const diaSemanaInicio = primerDiaMes.getDay(); // 0 = domingo
  const totalDiasMes = ultimoDiaMes.getDate();

  const celdas = [];

  // Días vacíos antes del día 1 (del mes anterior)
  for (let i = 0; i < diaSemanaInicio; i++) {
    celdas.push({ vacio: true });
  }

  // Días del mes actual
  for (let dia = 1; dia <= totalDiasMes; dia++) {
    const fechaCelda = new Date(primerDiaMes.getFullYear(), primerDiaMes.getMonth(), dia);
    const fechaStr = formatearFecha(fechaCelda);
    celdas.push({ dia, fechaStr, citas: citasPorDia[fechaStr] || [], esHoy: fechaStr === hoyStr });
  }

  calendarioGrid.innerHTML = celdas.map(c => {
    if (c.vacio) return `<div class="dia-calendario fuera-de-mes"></div>`;

    const citasDia = c.citas.slice(0, 3);
    const restantes = c.citas.length - citasDia.length;

    return `
      <div class="dia-calendario ${c.esHoy ? 'hoy' : ''}" onclick="irADiaEnLista('${c.fechaStr}')">
        <div class="numero-dia">${c.dia}</div>
        ${citasDia.map(cita => `
          <div class="chip-cita-calendario chip-${cita.estado}">${cita.hora.slice(0,5)} ${escaparHTML(cita.paciente)}</div>
        `).join('')}
        ${restantes > 0 ? `<div class="mas-citas">+${restantes} más</div>` : ''}
      </div>
    `;
  }).join('');
}

function irADiaEnLista(fechaStr) {
  filtroDesde.value = fechaStr;
  filtroHasta.value = fechaStr;
  cargarAgenda();
  btnVistaLista.click();
}