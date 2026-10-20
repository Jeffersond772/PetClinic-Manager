const parametros = new URLSearchParams(window.location.search);
const idPaciente = parametros.get('id_paciente');
const idCita = parametros.get('id_cita');
let idCitaValida = null;
const fichaPaciente = document.getElementById('fichaPaciente');
const listaConsultas = document.getElementById('listaConsultas');
const tablaProcedimientos = document.getElementById('tablaProcedimientos');

const modalConsulta = document.getElementById('modalConsulta');
const formConsulta = document.getElementById('formConsulta');
const mensajeErrorConsulta = document.getElementById('mensajeErrorConsulta');
const listaTratamientosForm = document.getElementById('listaTratamientosForm');
const listaServiciosConsulta = document.getElementById('listaServiciosConsulta');

const modalProcedimiento = document.getElementById('modalProcedimiento');
const formProcedimiento = document.getElementById('formProcedimiento');
const mensajeErrorProcedimiento = document.getElementById('mensajeErrorProcedimiento');
const selectProductoProcedimiento = document.getElementById('productoProcedimiento');
const selectServicioProcedimiento = document.getElementById('servicioProcedimiento');

let productosDisponibles = [];
let serviciosDisponibles = [];
let contadorTratamientos = 0;
let contadorServiciosConsulta = 0;

if (!idPaciente) {
  window.location.href = 'pacientes.html';
}

function formatearPrecio(valor) {
  return Number(valor || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 });
}

function fechaTexto(valor) {
  if (!valor) return '-';
  return String(valor).split('T')[0];
}

// ==================== CARGA INICIAL ====================

async function cargarHistoria() {
  try {
    const respuesta = await fetch(`${API_URL}/api/historias/paciente/${idPaciente}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (respuesta.status === 401 || respuesta.status === 403) {
      mostrarAlerta('No tienes permisos para ver historias clínicas');
      window.location.href = 'pacientes.html';
      return;
    }

    const datos = await respuesta.json();
    if (!respuesta.ok) {
      throw new Error(datos.mensaje || 'No fue posible cargar la historia clínica');
    }

    pintarFicha(datos.paciente);
    pintarConsultas(datos.consultas || []);
    pintarProcedimientos(datos.procedimientos || []);
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
      <div><span>Peso actual</span>${p.peso ? escaparHTML(p.peso) + ' kg' : '-'}</div>
      <div><span>Nacimiento</span>${fechaTexto(p.fecha_nacimiento)}</div>
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
        <span>${fechaTexto(c.fecha)}</span>
        <span>Dr(a). ${escaparHTML(c.veterinario)}</span>
      </div>
      <h4>${escaparHTML(c.motivo_consulta) || 'Consulta general'}</h4>
      ${c.sintomas ? `<p><span class="etiqueta">Síntomas:</span> ${escaparHTML(c.sintomas)}</p>` : ''}
      ${c.diagnostico ? `<p><span class="etiqueta">Diagnóstico:</span> ${escaparHTML(c.diagnostico)}</p>` : ''}
      ${c.procedimientos_realizados ? `<p><span class="etiqueta">Procedimientos / notas:</span> ${escaparHTML(c.procedimientos_realizados)}</p>` : ''}
      ${c.observaciones ? `<p><span class="etiqueta">Observaciones:</span> ${escaparHTML(c.observaciones)}</p>` : ''}
      ${c.tratamientos && c.tratamientos.length > 0 ? `
        <div class="lista-tratamientos-mostrar">
          <span class="etiqueta">Tratamientos / fórmula:</span>
          <ul>
            ${c.tratamientos.map(t => {
    const nombre = t.producto || t.nombre_medicamento || 'Medicamento';
    const detalles = [t.cantidad ? `Cantidad: ${t.cantidad}` : '', t.dosis || '', t.indicaciones || '']
      .filter(Boolean).map(escaparHTML).join(' · ');
    return `<li>${escaparHTML(nombre)}${detalles ? ` — ${detalles}` : ''}</li>`;
  }).join('')}
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
      <td>${fechaTexto(p.fecha)}</td>
      <td style="text-transform: capitalize;">${escaparHTML(String(p.tipo || '').replaceAll('_', ' '))}</td>
      <td>${escaparHTML(p.producto) || '-'}</td>
      <td>${escaparHTML(p.veterinario)}</td>
      <td>${escaparHTML(p.observaciones) || '-'}</td>
    </tr>
  `).join('');
}

// ==================== CATÁLOGOS DE PRODUCTOS Y SERVICIOS ====================

async function cargarCatalogosHistoria() {
  const [respuestaProductos, respuestaServicios] = await Promise.all([
    fetch(`${API_URL}/api/productos`, { headers: { 'Authorization': `Bearer ${token}` } }),
    fetch(`${API_URL}/api/servicios`, { headers: { 'Authorization': `Bearer ${token}` } })
  ]);

  if (!respuestaProductos.ok || !respuestaServicios.ok) {
    throw new Error('No se pudieron cargar los productos o servicios del catálogo');
  }

  productosDisponibles = await respuestaProductos.json();
  serviciosDisponibles = await respuestaServicios.json();
}

function opcionesProductos() {
  return productosDisponibles.map(p =>
    `<option value="${p.id_producto}">${escaparHTML(p.nombre)} — $${formatearPrecio(p.precio)} (disp: ${escaparHTML(p.cantidad_disponible)})</option>`
  ).join('');
}

function opcionesServicios() {
  return serviciosDisponibles.map(s =>
    `<option value="${s.id_servicio}">${escaparHTML(s.nombre)} — $${formatearPrecio(s.precio)}</option>`
  ).join('');
}

// ==================== FORMULARIO: TRATAMIENTOS / FÓRMULAS ====================

function crearFilaTratamiento() {
  contadorTratamientos++;
  const idFila = `tratamiento-${contadorTratamientos}`;
  const div = document.createElement('div');
  div.className = 'fila-formula';
  div.id = idFila;
  div.innerHTML = `
    <div class="fila-formula-principal">
      <select class="select-producto-tratamiento" aria-label="Producto del tratamiento">
        <option value="">Medicamento no inventariado</option>
        ${opcionesProductos()}
      </select>
      <input type="number" min="0.01" step="0.01" class="input-cantidad-tratamiento" placeholder="Cantidad">
      <button type="button" class="btn-quitar-tratamiento" aria-label="Quitar tratamiento">×</button>
    </div>
    <div class="fila-formula-detalle">
      <input type="text" maxlength="150" class="input-nombre-medicamento" placeholder="Nombre / fórmula manual">
      <input type="text" maxlength="150" class="input-dosis-tratamiento" placeholder="Dosis">
      <input type="text" maxlength="250" class="input-indicaciones-tratamiento" placeholder="Indicaciones">
    </div>
  `;
  div.querySelector('.btn-quitar-tratamiento').addEventListener('click', () => div.remove());
  listaTratamientosForm.appendChild(div);
}

document.getElementById('btnAgregarTratamiento').addEventListener('click', crearFilaTratamiento);

// ==================== FORMULARIO: SERVICIOS COBRABLES DE LA CONSULTA ====================

function crearFilaServicioConsulta() {
  contadorServiciosConsulta++;
  const idFila = `servicio-consulta-${contadorServiciosConsulta}`;
  const div = document.createElement('div');
  div.className = 'fila-servicio-consulta';
  div.id = idFila;
  div.innerHTML = `
    <select class="select-servicio-consulta" aria-label="Servicio para facturar">
      <option value="">Selecciona un servicio del catálogo</option>
      ${opcionesServicios()}
    </select>
    <input type="number" min="0.01" step="0.01" class="input-cantidad-servicio-consulta" placeholder="Cant." value="1">
    <button type="button" class="btn-quitar-tratamiento" aria-label="Quitar servicio">×</button>
  `;
  div.querySelector('.btn-quitar-tratamiento').addEventListener('click', () => div.remove());
  listaServiciosConsulta.appendChild(div);
}

document.getElementById('btnAgregarServicioConsulta').addEventListener('click', crearFilaServicioConsulta);

// ==================== MODAL: NUEVA CONSULTA ====================

document.getElementById('btnNuevaConsulta').addEventListener('click', () => {
  formConsulta.reset();
  listaTratamientosForm.innerHTML = '';
  listaServiciosConsulta.innerHTML = '';
  mensajeErrorConsulta.textContent = '';
  modalConsulta.classList.remove('oculto');
});

document.getElementById('btnCancelarConsulta').addEventListener('click', () => {
  modalConsulta.classList.add('oculto');
});

formConsulta.addEventListener('submit', async (e) => {
  e.preventDefault();
  mensajeErrorConsulta.textContent = '';

  const tratamientos = [];
  const filasTratamientos = listaTratamientosForm.querySelectorAll('.fila-formula');

  for (const fila of filasTratamientos) {
    const id_producto = fila.querySelector('.select-producto-tratamiento').value;
    const nombre_medicamento = fila.querySelector('.input-nombre-medicamento').value.trim();
    const cantidadTexto = fila.querySelector('.input-cantidad-tratamiento').value.trim();
    const dosis = fila.querySelector('.input-dosis-tratamiento').value.trim();
    const indicaciones = fila.querySelector('.input-indicaciones-tratamiento').value.trim();
    const tieneContenido = Boolean(id_producto || nombre_medicamento || cantidadTexto || dosis || indicaciones);

    if (!tieneContenido) continue;

    if (!id_producto && !nombre_medicamento) {
      mensajeErrorConsulta.textContent = 'En cada tratamiento, selecciona un producto del inventario o escribe el nombre del medicamento/formula.';
      return;
    }

    if (cantidadTexto && (!Number.isFinite(Number(cantidadTexto)) || Number(cantidadTexto) <= 0)) {
      mensajeErrorConsulta.textContent = 'La cantidad de cada tratamiento debe ser mayor que cero.';
      return;
    }

    if (id_producto && !cantidadTexto) {
      mensajeErrorConsulta.textContent = 'Indica la cantidad utilizada para cada producto del inventario; esa cantidad se facturará y descontará del stock.';
      return;
    }

    tratamientos.push({
      id_producto: id_producto || null,
      nombre_medicamento: nombre_medicamento || null,
      cantidad: cantidadTexto || null,
      dosis: dosis || null,
      indicaciones: indicaciones || null
    });
  }

  const servicios_cobrables = [];
  const filasServicios = listaServiciosConsulta.querySelectorAll('.fila-servicio-consulta');
  for (const fila of filasServicios) {
    const id_servicio = fila.querySelector('.select-servicio-consulta').value;
    const cantidadTexto = fila.querySelector('.input-cantidad-servicio-consulta').value.trim();
    if (!id_servicio) continue;

    if (!cantidadTexto || !Number.isFinite(Number(cantidadTexto)) || Number(cantidadTexto) <= 0) {
      mensajeErrorConsulta.textContent = 'La cantidad de cada servicio debe ser mayor que cero.';
      return;
    }
    servicios_cobrables.push({ id_servicio, cantidad: cantidadTexto });
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
    tratamientos,
    servicios_cobrables
  };

  try {
    const respuesta = await fetch(`${API_URL}/api/consultas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(datos)
    });
    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      mensajeErrorConsulta.textContent = resultado.mensaje || 'Ocurrió un error al guardar la consulta';
      return;
    }

    modalConsulta.classList.add('oculto');
    await cargarHistoria();

    if (resultado.id_cuenta) {
      mostrarAlerta(`Consulta guardada. Se creó la venta #${resultado.id_cuenta} por $${formatearPrecio(resultado.total_facturado)}. Puedes verla y registrar el pago en Ventas.`);
    } else {
      mostrarAlerta('Consulta guardada. No se creó una venta porque no se seleccionaron productos del inventario ni servicios del catálogo para cobrar.');
    }
  } catch (error) {
    console.error(error);
    mensajeErrorConsulta.textContent = 'No se pudo conectar con el servidor';
  }
});

// ==================== MODAL: VACUNA / PROCEDIMIENTO PREVENTIVO ====================

document.getElementById('btnNuevoProcedimiento').addEventListener('click', () => {
  formProcedimiento.reset();
  mensajeErrorProcedimiento.textContent = '';

  selectProductoProcedimiento.innerHTML = '<option value="">Ninguno / no aplica</option>' + opcionesProductos();
  selectServicioProcedimiento.innerHTML = '<option value="">No cobrar un servicio adicional</option>' + opcionesServicios();

  const hoyLocal = (() => {
    const f = new Date();
    return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
  })();
  document.getElementById('fechaProcedimiento').value = hoyLocal;
  document.getElementById('fechaProcedimiento').max = hoyLocal;
  modalProcedimiento.classList.remove('oculto');
});

document.getElementById('btnCancelarProcedimiento').addEventListener('click', () => {
  modalProcedimiento.classList.add('oculto');
});

formProcedimiento.addEventListener('submit', async (e) => {
  e.preventDefault();
  mensajeErrorProcedimiento.textContent = '';

  const id_producto = selectProductoProcedimiento.value || null;
  const cantidad = document.getElementById('cantidadProcedimiento').value || null;
  const id_servicio = selectServicioProcedimiento.value || null;

  if (id_producto && (!cantidad || !Number.isFinite(Number(cantidad)) || Number(cantidad) <= 0)) {
    mensajeErrorProcedimiento.textContent = 'Indica una cantidad mayor que cero para el producto aplicado.';
    return;
  }

  const datos = {
      const datos = {
    id_paciente: idPaciente,
    id_cita: idCitaValida,
    motivo_consulta: document.getElementById('motivoConsulta').value || null,
    tipo: document.getElementById('tipoProcedimiento').value,
    id_producto,
    cantidad,
    id_servicio,
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
    await cargarHistoria();

    if (resultado.id_cuenta) {
      mostrarAlerta(`Procedimiento guardado. Se creó la venta #${resultado.id_cuenta} por $${formatearPrecio(resultado.total_facturado)}. Puedes verla y registrar el pago en Ventas.`);
    } else {
      mostrarAlerta('Procedimiento guardado. No se creó una venta porque no seleccionaste un producto del inventario ni un servicio cobrable.');
    }
    if (idCitaValida) {
      document.getElementById('btnAlertaOk').onclick = () => { window.location.href = 'citas.html'; };
      idCitaValida = null;
    }
  } catch (error) {
    console.error(error);
    mensajeErrorProcedimiento.textContent = 'No se pudo conectar con el servidor';
  }
});

// ---- Carga inicial ----
async function abrirConsultaDesdeCita() {
  try {
    const respuesta = await fetch(`${API_URL}/api/citas/${idCita}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const cita = await respuesta.json();

    if (!respuesta.ok || String(cita.id_paciente) !== String(idPaciente) || cita.estado !== 'programada') {
      mostrarAlerta('Esa cita ya no está programada o no corresponde a este paciente. Puedes registrar la consulta sin vincularla.');
      return;
    }
    idCitaValida = cita.id_cita;
    document.getElementById('btnNuevaConsulta').click();
    document.getElementById('motivoConsulta').value = cita.motivo || '';
    const titulo = modalConsulta.querySelector('h3');
    if (titulo) titulo.textContent = `Registrar consulta (cita #${cita.id_cita})`;
  } catch (error) {
    console.error(error);
  }
}

// ---- Carga inicial ----
(async function iniciarHistoria() {
  try {
    await cargarCatalogosHistoria();
  } catch (error) {
    console.error(error);
    mostrarAlerta('No se pudieron cargar los productos o servicios. La historia clínica se abrirá, pero verifica el catálogo antes de registrar elementos para cobrar.');
  }
  await cargarHistoria();
  if (idCita && parametros.get('nueva_consulta') === '1') await abrirConsultaDesdeCita();
})();