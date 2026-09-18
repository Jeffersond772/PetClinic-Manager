const tablaCompras = document.getElementById('tablaCompras');
const modalCompra = document.getElementById('modalCompra');
const formCompra = document.getElementById('formCompra');
const mensajeErrorCompra = document.getElementById('mensajeErrorCompra');
const listaItemsCompra = document.getElementById('listaItemsCompra');
const totalCompra = document.getElementById('totalCompra');
const selectProveedorCompra = document.getElementById('proveedorCompra');

const modalDetalleCompra = document.getElementById('modalDetalleCompra');
const contenidoDetalleCompra = document.getElementById('contenidoDetalleCompra');

let productosDisponiblesCompra = [];
let contadorItemsCompra = 0;

async function cargarProveedoresYProductos() {
  const [respProv, respProd] = await Promise.all([
    fetch(`${API_URL}/api/proveedores`, { headers: { 'Authorization': `Bearer ${token}` } }),
    fetch(`${API_URL}/api/productos`, { headers: { 'Authorization': `Bearer ${token}` } })
  ]);
  const proveedores = await respProv.json();
  productosDisponiblesCompra = await respProd.json();

  selectProveedorCompra.innerHTML = '<option value="">Selecciona un proveedor</option>' +
    proveedores.map(p => `<option value="${p.id_proveedor}">${escaparHTML(p.nombre)}</option>`).join('');
}

async function cargarCompras() {
  mostrarCargando(tablaCompras, 5);
  try {
    const respuesta = await fetch(`${API_URL}/api/compras`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (respuesta.status === 401 || respuesta.status === 403) {
      window.location.href = 'index.html';
      return;
    }

    const compras = await respuesta.json();
    pintarTabla(compras);

  } catch (error) {
    console.error(error);
    tablaCompras.innerHTML = `<tr><td colspan="5" class="tabla-vacia">No se pudo conectar con el servidor</td></tr>`;
  }
}

function pintarTabla(compras) {
  if (compras.length === 0) {
    tablaCompras.innerHTML = `<tr><td colspan="5" class="tabla-vacia">No hay compras registradas</td></tr>`;
    return;
  }

  tablaCompras.innerHTML = compras.map(c => `
    <tr>
      <td>${c.fecha.split('T')[0]}</td>
      <td>${escaparHTML(c.proveedor)}</td>
      <td>$${Number(c.total).toLocaleString()}</td>
      <td>${escaparHTML(c.registrado_por)}</td>
      <td><button class="btn-icono" onclick="verDetalleCompra(${c.id_compra})">Ver detalle</button></td>
    </tr>
  `).join('');
}

function crearFilaItemCompra() {
  contadorItemsCompra++;
  const idFila = `item-compra-${contadorItemsCompra}`;

  const opciones = productosDisponiblesCompra.map(p => `<option value="${p.id_producto}">${escaparHTML(p.nombre)}</option>`).join('');

  const div = document.createElement('div');
  div.className = 'fila-item-compra';
  div.id = idFila;
  div.innerHTML = `
    <select class="select-producto-compra">
      <option value="">Selecciona un producto</option>
      ${opciones}
    </select>
    <input type="number" step="0.01" class="input-cantidad-compra" placeholder="Cant.">
    <input type="number" step="0.01" class="input-costo-compra" placeholder="Costo unit.">
    <input type="date" class="input-vencimiento-compra" title="Fecha de vencimiento (opcional)">
    <button type="button" class="btn-quitar-tratamiento" onclick="document.getElementById('${idFila}').remove(); recalcularTotalCompra();">×</button>
  `;
  listaItemsCompra.appendChild(div);

  div.querySelector('.input-cantidad-compra').addEventListener('input', recalcularTotalCompra);
  div.querySelector('.input-costo-compra').addEventListener('input', recalcularTotalCompra);
}

function recalcularTotalCompra() {
  let total = 0;
  listaItemsCompra.querySelectorAll('.fila-item-compra').forEach(fila => {
    const cantidad = Number(fila.querySelector('.input-cantidad-compra').value) || 0;
    const costo = Number(fila.querySelector('.input-costo-compra').value) || 0;
    total += cantidad * costo;
  });
  totalCompra.textContent = `$${total.toLocaleString()}`;
}

document.getElementById('btnAgregarItemCompra').addEventListener('click', crearFilaItemCompra);

document.getElementById('btnNuevaCompra').addEventListener('click', () => {
  formCompra.reset();
  listaItemsCompra.innerHTML = '';
  totalCompra.textContent = '$0';
  mensajeErrorCompra.textContent = '';
  modalCompra.classList.remove('oculto');
});

document.getElementById('btnCancelarCompra').addEventListener('click', () => {
  modalCompra.classList.add('oculto');
});

formCompra.addEventListener('submit', async (e) => {
  e.preventDefault();
  mensajeErrorCompra.textContent = '';

  const id_proveedor = selectProveedorCompra.value;
  if (!id_proveedor) {
    mensajeErrorCompra.textContent = 'Debes seleccionar un proveedor';
    return;
  }

  const items = [];
  listaItemsCompra.querySelectorAll('.fila-item-compra').forEach(fila => {
    const id_producto = fila.querySelector('.select-producto-compra').value;
    const cantidad = fila.querySelector('.input-cantidad-compra').value;
    const costo_unitario = fila.querySelector('.input-costo-compra').value;
    const fecha_vencimiento = fila.querySelector('.input-vencimiento-compra').value || null;

    if (id_producto && cantidad && costo_unitario) {
      items.push({ id_producto, cantidad, costo_unitario, fecha_vencimiento });
    }
  });

  if (items.length === 0) {
    mensajeErrorCompra.textContent = 'Agrega al menos un producto con cantidad y costo';
    return;
  }

  try {
    const respuesta = await fetch(`${API_URL}/api/compras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ id_proveedor, items })
    });
    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      mensajeErrorCompra.textContent = resultado.mensaje || 'Ocurrió un error al registrar la compra';
      return;
    }

    modalCompra.classList.add('oculto');
    cargarCompras();

  } catch (error) {
    mensajeErrorCompra.textContent = 'No se pudo conectar con el servidor';
  }
});

async function verDetalleCompra(id_compra) {
  const respuesta = await fetch(`${API_URL}/api/compras/${id_compra}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const compra = await respuesta.json();

  contenidoDetalleCompra.innerHTML = `
    <p class="texto-secundario">Proveedor: ${escaparHTML(compra.proveedor)} · ${compra.fecha.split('T')[0]}</p>
    ${compra.detalle.map(d => `
      <div class="detalle-cuenta-item">
        <span>${escaparHTML(d.producto)} (x${d.cantidad}) ${d.fecha_vencimiento ? '· vence ' + d.fecha_vencimiento.split('T')[0] : ''}</span>
        <span>$${(Number(d.cantidad) * Number(d.costo_unitario)).toLocaleString()}</span>
      </div>
    `).join('')}
    <div class="detalle-cuenta-resumen">
      <p><span>Total</span><strong>$${Number(compra.total).toLocaleString()}</strong></p>
    </div>
  `;

  modalDetalleCompra.classList.remove('oculto');
}

document.getElementById('btnCerrarDetalleCompra').addEventListener('click', () => {
  modalDetalleCompra.classList.add('oculto');
});

cargarProveedoresYProductos();
cargarCompras();