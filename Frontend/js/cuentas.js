const tablaCuentas = document.getElementById('tablaCuentas');

const modalCuenta = document.getElementById('modalCuenta');
const formCuenta = document.getElementById('formCuenta');
const mensajeErrorCuenta = document.getElementById('mensajeErrorCuenta');
const listaItemsForm = document.getElementById('listaItemsForm');
const totalEstimado = document.getElementById('totalEstimado');

const inputPropietarioTexto = document.getElementById('propietarioTexto');
const inputPropietarioId = document.getElementById('idPropietarioSeleccionado');
const resultadosPropietario = document.getElementById('resultadosPropietario');

const modalDetalleCuenta = document.getElementById('modalDetalleCuenta');
const contenidoDetalleCuenta = document.getElementById('contenidoDetalleCuenta');
const formPago = document.getElementById('formPago');
const mensajeErrorPago = document.getElementById('mensajeErrorPago');

let productosDisponibles = [];
let serviciosDisponibles = [];
let contadorItems = 0;

// ==================== CARGA INICIAL ====================

async function cargarCatalogos() {
  const [respProd, respServ] = await Promise.all([
    fetch(`${API_URL}/api/productos`, { headers: { 'Authorization': `Bearer ${token}` } }),
    fetch(`${API_URL}/api/servicios`, { headers: { 'Authorization': `Bearer ${token}` } })
  ]);
  productosDisponibles = await respProd.json();
  serviciosDisponibles = await respServ.json();
}

async function cargarCuentas() {
  try {
    const respuesta = await fetch(`${API_URL}/api/cuentas`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (respuesta.status === 401 || respuesta.status === 403) {
      window.location.href = 'index.html';
      return;
    }

    const cuentas = await respuesta.json();
    pintarTabla(cuentas);

  } catch (error) {
    console.error(error);
    tablaCuentas.innerHTML = `<tr><td colspan="6" class="tabla-vacia">No se pudo conectar con el servidor</td></tr>`;
  }
}

function pintarTabla(cuentas) {
  if (cuentas.length === 0) {
    tablaCuentas.innerHTML = `<tr><td colspan="6" class="tabla-vacia">No hay cuentas registradas</td></tr>`;
    return;
  }

  tablaCuentas.innerHTML = cuentas.map(c => `
    <tr>
      <td>${c.fecha.split('T')[0]}</td>
      <td>${c.propietario}</td>
      <td>$${Number(c.total).toLocaleString()}</td>
      <td>$${Number(c.total_pagado).toLocaleString()}</td>
      <td><span class="badge-estado badge-${c.estado}">${c.estado}</span></td>
      <td><button class="btn-icono" onclick="verDetalle(${c.id_cuenta})">Ver / Pagar</button></td>
    </tr>
  `).join('');
}

// ==================== AUTOCOMPLETAR PROPIETARIO ====================

let temporizadorAutocompletar;
inputPropietarioTexto.addEventListener('input', () => {
  inputPropietarioId.value = '';
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
            ${p.nombre}
          </div>
        `).join('');

    resultadosPropietario.classList.add('visible');
  }, 300);
});

function seleccionarPropietario(id, nombre) {
  inputPropietarioId.value = id;
  inputPropietarioTexto.value = nombre;
  resultadosPropietario.classList.remove('visible');
}

// ==================== ITEMS DINÁMICOS (productos/servicios) ====================

function crearFilaItem(tipo) {
  contadorItems++;
  const idFila = `item-${contadorItems}`;

  const opciones = tipo === 'producto'
    ? productosDisponibles.map(p => `<option value="${p.id_producto}" data-precio="${p.precio}">${p.nombre} — $${p.precio}</option>`).join('')
    : serviciosDisponibles.map(s => `<option value="${s.id_servicio}" data-precio="${s.precio}">${s.nombre} — $${s.precio}</option>`).join('');

  const div = document.createElement('div');
  div.className = 'fila-tratamiento';
  div.id = idFila;
  div.dataset.tipo = tipo;
  div.innerHTML = `
    <select class="select-item">
      <option value="">Selecciona ${tipo === 'producto' ? 'un producto' : 'un servicio'}</option>
      ${opciones}
    </select>
    <input type="number" step="0.01" class="input-cantidad-item" placeholder="Cant." value="1">
    <button type="button" class="btn-quitar-tratamiento" onclick="document.getElementById('${idFila}').remove(); recalcularTotal();">×</button>
  `;
  listaItemsForm.appendChild(div);

  div.querySelector('.select-item').addEventListener('change', recalcularTotal);
  div.querySelector('.input-cantidad-item').addEventListener('input', recalcularTotal);
}

function recalcularTotal() {
  let total = 0;
  listaItemsForm.querySelectorAll('.fila-tratamiento').forEach(fila => {
    const select = fila.querySelector('.select-item');
    const cantidad = Number(fila.querySelector('.input-cantidad-item').value) || 0;
    const opcionSeleccionada = select.options[select.selectedIndex];
    const precio = Number(opcionSeleccionada?.dataset.precio || 0);
    total += precio * cantidad;
  });
  totalEstimado.textContent = `$${total.toLocaleString()}`;
}

document.getElementById('btnAgregarProducto').addEventListener('click', () => crearFilaItem('producto'));
document.getElementById('btnAgregarServicio').addEventListener('click', () => crearFilaItem('servicio'));

// ==================== MODAL: NUEVA CUENTA ====================

document.getElementById('btnNuevaCuenta').addEventListener('click', () => {
  formCuenta.reset();
  inputPropietarioId.value = '';
  listaItemsForm.innerHTML = '';
  totalEstimado.textContent = '$0';
  mensajeErrorCuenta.textContent = '';
  modalCuenta.classList.remove('oculto');
});

document.getElementById('btnCancelarCuenta').addEventListener('click', () => {
  modalCuenta.classList.add('oculto');
});

formCuenta.addEventListener('submit', async (e) => {
  e.preventDefault();
  mensajeErrorCuenta.textContent = '';

  const id_propietario = inputPropietarioId.value;
  if (!id_propietario) {
    mensajeErrorCuenta.textContent = 'Debes seleccionar un propietario de la lista';
    return;
  }

  const items = [];
  listaItemsForm.querySelectorAll('.fila-tratamiento').forEach(fila => {
    const tipo = fila.dataset.tipo;
    const idItem = fila.querySelector('.select-item').value;
    const cantidad = fila.querySelector('.input-cantidad-item').value;

    if (idItem && cantidad) {
      items.push(tipo === 'producto'
        ? { tipo: 'producto', id_producto: idItem, cantidad }
        : { tipo: 'servicio', id_servicio: idItem, cantidad }
      );
    }
  });

  if (items.length === 0) {
    mensajeErrorCuenta.textContent = 'Agrega al menos un producto o servicio';
    return;
  }

  try {
    const respuesta = await fetch(`${API_URL}/api/cuentas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ id_propietario, items })
    });
    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      // Aquí llega, por ejemplo: "Stock insuficiente para 'Amoxicilina 250mg'"
      mensajeErrorCuenta.textContent = resultado.mensaje || 'Ocurrió un error al crear la cuenta';
      return;
    }

    modalCuenta.classList.add('oculto');
    cargarCuentas();
    cargarCatalogos(); // refresca precios/stock por si algo cambió

  } catch (error) {
    mensajeErrorCuenta.textContent = 'No se pudo conectar con el servidor';
  }
});

// ==================== MODAL: DETALLE / PAGO ====================

async function verDetalle(id_cuenta) {
  const respuesta = await fetch(`${API_URL}/api/cuentas/${id_cuenta}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const cuenta = await respuesta.json();

  const totalPagado = cuenta.pagos.reduce((suma, p) => suma + Number(p.monto), 0);
  const saldo = Number(cuenta.total) - totalPagado;

  contenidoDetalleCuenta.innerHTML = `
    <p class="texto-secundario">Propietario: ${cuenta.propietario} · ${cuenta.fecha.split('T')[0]}</p>
    ${cuenta.detalle.map(d => `
      <div class="detalle-cuenta-item">
        <span>${d.producto || d.servicio} (x${d.cantidad})</span>
        <span>$${Number(d.subtotal).toLocaleString()}</span>
      </div>
    `).join('')}
    <div class="detalle-cuenta-resumen">
      <p><span>Total</span><strong>$${Number(cuenta.total).toLocaleString()}</strong></p>
      <p><span>Pagado</span><span>$${totalPagado.toLocaleString()}</span></p>
      <p><span>Saldo pendiente</span><strong>$${saldo.toLocaleString()}</strong></p>
    </div>
  `;

  document.getElementById('idCuentaPago').value = id_cuenta;
  document.getElementById('montoPago').value = saldo > 0 ? saldo : '';
  mensajeErrorPago.textContent = '';

  // Si ya está pagada, ocultamos el formulario de pago
    // Si ya está pagada, ocultamos SOLO los campos de pago, nunca el botón de cerrar
  const pagada = cuenta.estado === 'pagada';
  document.getElementById('camposPago').style.display = pagada ? 'none' : 'block';
  document.getElementById('btnRegistrarPago').style.display = pagada ? 'none' : 'inline-block';

  modalDetalleCuenta.classList.remove('oculto');
}

document.getElementById('btnCerrarDetalleCuenta').addEventListener('click', () => {
  modalDetalleCuenta.classList.add('oculto');
});

formPago.addEventListener('submit', async (e) => {
  e.preventDefault();
  mensajeErrorPago.textContent = '';

  const id_cuenta = document.getElementById('idCuentaPago').value;
  const datos = {
    monto: document.getElementById('montoPago').value,
    metodo_pago: document.getElementById('metodoPago').value
  };

  try {
    const respuesta = await fetch(`${API_URL}/api/cuentas/${id_cuenta}/pagos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(datos)
    });
    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      mensajeErrorPago.textContent = resultado.mensaje || 'Ocurrió un error al registrar el pago';
      return;
    }

    modalDetalleCuenta.classList.add('oculto');
    cargarCuentas();

  } catch (error) {
    mensajeErrorPago.textContent = 'No se pudo conectar con el servidor';
  }
});

// ---- Carga inicial ----
cargarCatalogos();
cargarCuentas();