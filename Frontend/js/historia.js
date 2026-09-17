const parametros = new URLSearchParams(window.location.search);
const idPaciente = parametros.get('id_paciente');

const fichaPaciente = document.getElementById('fichaPaciente');
const listaConsultas = document.getElementById('listaConsultas');
const tablaProcedimientos = document.getElementById('tablaProcedimientos');

const modalConsulta = document.getElementById('modalConsulta');
const formConsulta = document.getElementById('formConsulta');
const mensajeErrorConsulta = document.getElementById('mensajeErrorConsulta');
const listaTratamientosForm = document.getElementById('listaTratamientosForm');

const modalProcedimiento = document.getElementById('modalProcedimiento');
const formProcedimiento = document.getElementById('formProcedimiento');
const mensajeErrorProcedimiento = document.getElementById('mensajeErrorProcedimiento');
const selectProductoProcedimiento = document.getElementById('productoProcedimiento');

let productosDisponibles = []; // catálogo de inventario, para los <select> de tratamientos
let contadorTratamientos = 0;

if (!idPaciente) {
  window.location.href = 'pacientes.html';
}

// ==================== CARGA INICIAL ====================

async function cargarHistoria() {
  try {
    const respuesta = await fetch(`${API_URL}/api/historias/paciente/${idPaciente}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (respuesta.status === 401 || respuesta.status === 403) {
      alert('No tienes permisos para ver historias clínicas');
      window.location.href = 'pacientes.html';
      return;
    }

    const datos = await respuesta.json();
    pintarFicha(datos.paciente);
    pintarConsultas(datos.consultas);
    pintarProcedimientos(datos.procedimientos);

  } catch (error) {
    console.error(error);
    fichaPaciente.innerHTML = `<p class="error-mensaje">No se pudo cargar la historia clínica</p>`;
  }
}

function pintarFicha(p) {
  fichaPaciente.innerHTML = `
    <h2>${escaparHTML(p.nombre)}</h2>
    <p class="subinfo">Propietario: ${escaparHTML(p.propietario)} · Tel: ${escaparHTML(p.telefono_propietario) || '-'}</p>
    <div class="ficha-datos">
      <div><span>Especie</span>${escaparHTML(p.especie)}</div>
      <div><span>Raza</span>${escaparHTML(p.raza) || '-'}</div>
      <div><span>Sexo</span>${escaparHTML(p.sexo)}</div>
      <div><span>Peso actual</span>${p.peso ? p.peso + ' kg' : '-'}</div>
      <div><span>Nacimiento</span>${p.fecha_nacimiento ? p.fecha_nacimiento.split('T')[0] : '-'}</div>
    </div>
  `;
}

function pintarConsultas(consultas) {
  if (consultas.length === 0) {
    listaConsultas.innerHTML = `<p class="texto-secundario">Este paciente aún no tiene consultas registradas.</p>`;
    return;
  }

  listaConsultas.innerHTML = consultas.map(c => `
    <div class="tarjeta-consulta">
      <div class="encabezado-consulta">
        <span>${c.fecha.split('T')[0]}</span>
        <span>Dr(a). ${escaparHTML(c.veterinario)}</span>
      </div>
      <h4>${escaparHTML(c.motivo_consulta) || 'Consulta general'}</h4>
      ${c.sintomas ? `<p><span class="etiqueta">Síntomas:</span> ${escaparHTML(c.sintomas)}</p>` : ''}
      ${c.diagnostico ? `<p><span class="etiqueta">Diagnóstico:</span> ${escaparHTML(c.diagnostico)}</p>` : ''}
      ${c.observaciones ? `<p><span class="etiqueta">Observaciones:</span> ${escaparHTML(c.observaciones)}</p>` : ''}
      ${c.tratamientos && c.tratamientos.length > 0 ? `
        <div class="lista-tratamientos-mostrar">
          <span class="etiqueta">Tratamientos:</span>
          <ul>
            ${c.tratamientos.map(t => `<li>${escaparHTML(t.producto || t.nombre_medicamento || 'Medicamento')} — ${escaparHTML(t.dosis) || ''} ${t.indicaciones ? '(' + escaparHTML(t.indicaciones) + ')' : ''}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `).join('');
}

function pintarProcedimientos(procedimientos) {
  if (procedimientos.length === 0) {
    tablaProcedimientos.innerHTML = `<tr><td colspan="5" class="tabla-vacia">No hay vacunas ni procedimientos registrados</td></tr>`;
    return;
  }

  tablaProcedimientos.innerHTML = procedimientos.map(p => `
    <tr>
      <td>${p.fecha.split('T')[0]}</td>
      <td style="text-transform: capitalize;">${p.tipo.replace('_', ' ')}</td>
      <td>${escaparHTML(p.producto) || '-'}</td>
      <td>${escaparHTML(p.veterinario)}</td>
      <td>${escaparHTML(p.observaciones) || '-'}</td>
    </tr>
  `).join('');
}

// ==================== MODAL: NUEVA CONSULTA ====================

async function cargarProductosDisponibles() {
  const respuesta = await fetch(`${API_URL}/api/productos`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  productosDisponibles = await respuesta.json();
}

function crearFilaTratamiento() {
  contadorTratamientos++;
  const idFila = `tratamiento-${contadorTratamientos}`;

  const opcionesProductos = productosDisponibles
    .map(p => `<option value="${p.id_producto}">${p.nombre} (disp: ${p.cantidad_disponible})</option>`)
    .join('');

  const div = document.createElement('div');
  div.className = 'fila-tratamiento';
  div.id = idFila;
  div.innerHTML = `
    <select class="select-producto-tratamiento">
      <option value="">Medicamento no inventariado</option>
      ${opcionesProductos}
    </select>
    <input type="number" step="0.01" class="input-cantidad-tratamiento" placeholder="Cantidad">
    <button type="button" class="btn-quitar-tratamiento" onclick="document.getElementById('${idFila}').remove()">×</button>
  `;
  listaTratamientosForm.appendChild(div);
}

document.getElementById('btnAgregarTratamiento').addEventListener('click', crearFilaTratamiento);

document.getElementById('btnNuevaConsulta').addEventListener('click', () => {
  formConsulta.reset();
  listaTratamientosForm.innerHTML = '';
  mensajeErrorConsulta.textContent = '';
  modalConsulta.classList.remove('oculto');
});

document.getElementById('btnCancelarConsulta').addEventListener('click', () => {
  modalConsulta.classList.add('oculto');
});

formConsulta.addEventListener('submit', async (e) => {
  e.preventDefault();
  mensajeErrorConsulta.textContent = '';

  // Recolectar los tratamientos agregados dinámicamente
  const filas = listaTratamientosForm.querySelectorAll('.fila-tratamiento');
  const tratamientos = [];

  for (const fila of filas) {
    const id_producto = fila.querySelector('.select-producto-tratamiento').value;
    const cantidad = fila.querySelector('.input-cantidad-tratamiento').value;

    if (id_producto && cantidad) {
      tratamientos.push({ id_producto, cantidad });
    }
  }

  const datos = {
    id_paciente: idPaciente,
    motivo_consulta: document.getElementById('motivoConsulta').value || null,
    sintomas: document.getElementById('sintomas').value || null,
    signos_vitales: document.getElementById('signosVitales').value || null,
    peso: document.getElementById('pesoConsulta').value || null,
    diagnostico: document.getElementById('diagnostico').value || null,
    procedimientos_realizados: document.getElementById('procedimientosRealizados').value || null,
    observaciones: document.getElementById('observacionesConsulta').value || null,
    tratamientos
  };

  try {
    const respuesta = await fetch(`${API_URL}/api/consultas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(datos)
    });
    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      // Aquí llega, por ejemplo: "Stock insuficiente para el producto id X"
      mensajeErrorConsulta.textContent = resultado.mensaje || 'Ocurrió un error al guardar la consulta';
      return;
    }

    modalConsulta.classList.add('oculto');
    cargarHistoria(); // recarga toda la ficha, incluyendo la nueva consulta

  } catch (error) {
    mensajeErrorConsulta.textContent = 'No se pudo conectar con el servidor';
  }
});

// ==================== MODAL: VACUNA / PROCEDIMIENTO ====================

document.getElementById('btnNuevoProcedimiento').addEventListener('click', () => {
  formProcedimiento.reset();
  mensajeErrorProcedimiento.textContent = '';

  selectProductoProcedimiento.innerHTML = '<option value="">Ninguno / no aplica</option>' +
    productosDisponibles.map(p => `<option value="${p.id_producto}">${p.nombre} (disp: ${p.cantidad_disponible})</option>`).join('');

  document.getElementById('fechaProcedimiento').value = new Date().toISOString().split('T')[0];
    document.getElementById('fechaProcedimiento').max = new Date().toISOString().split('T')[0];
  modalProcedimiento.classList.remove('oculto');
});

document.getElementById('btnCancelarProcedimiento').addEventListener('click', () => {
  modalProcedimiento.classList.add('oculto');
});

formProcedimiento.addEventListener('submit', async (e) => {
  e.preventDefault();
  mensajeErrorProcedimiento.textContent = '';

  const datos = {
    id_paciente: idPaciente,
    tipo: document.getElementById('tipoProcedimiento').value,
    id_producto: selectProductoProcedimiento.value || null,
    cantidad: document.getElementById('cantidadProcedimiento').value || null,
    fecha: document.getElementById('fechaProcedimiento').value,
    observaciones: document.getElementById('observacionesProcedimiento').value || null
  };

  try {
    const respuesta = await fetch(`${API_URL}/api/historias/procedimientos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(datos)
    });
    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      mensajeErrorProcedimiento.textContent = resultado.mensaje || 'Ocurrió un error al guardar';
      return;
    }

    modalProcedimiento.classList.add('oculto');
    cargarHistoria();

  } catch (error) {
    mensajeErrorProcedimiento.textContent = 'No se pudo conectar con el servidor';
  }
});

// ---- Carga inicial ----
cargarProductosDisponibles();
cargarHistoria();