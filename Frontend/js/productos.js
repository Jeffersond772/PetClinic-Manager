function fechaLocalISO(fecha) {
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}
document.getElementById('fechaVencimiento').min = fechaLocalISO(new Date());
const tablaProductos = document.getElementById('tablaProductos');
const inputBuscar = document.getElementById('inputBuscar');
const alertasStock = document.getElementById('alertasStock');

const modalProducto = document.getElementById('modalProducto');
const formProducto = document.getElementById('formProducto');
const tituloModalProducto = document.getElementById('tituloModalProducto');
const mensajeErrorProducto = document.getElementById('mensajeErrorProducto');
const selectCategoria = document.getElementById('categoria');

const modalMovimiento = document.getElementById('modalMovimiento');
const formMovimiento = document.getElementById('formMovimiento');
const tituloModalMovimiento = document.getElementById('tituloModalMovimiento');
const mensajeErrorMovimiento = document.getElementById('mensajeErrorMovimiento');
const productoMovimientoNombre = document.getElementById('productoMovimientoNombre');
const grupoCostoUnitario = document.getElementById('grupoCostoUnitario');
const selectMotivo = document.getElementById('motivoMovimiento');

let productos = [];

const motivosPorTipo = {
  entrada: ['compra', 'ajuste'],
  salida: ['venta', 'consumo_interno', 'consulta', 'ajuste']
};

// ---- Cargar categorías para el <select> ----
async function cargarCategorias() {
  const respuesta = await fetch(`${API_URL}/api/catalogos/categorias-producto`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const categorias = await respuesta.json();
  selectCategoria.innerHTML = '<option value="">Selecciona una categoría</option>' +
    categorias.map(c => `<option value="${c.id_categoria}">${c.nombre}</option>`).join('');
}

// ---- Cargar alertas (CU11 / CU19) ----
async function cargarAlertas() {
  const [respBajoStock, respVencer] = await Promise.all([
    fetch(`${API_URL}/api/productos/bajo-stock`, { headers: { 'Authorization': `Bearer ${token}` } }),
    fetch(`${API_URL}/api/productos/proximos-a-vencer`, { headers: { 'Authorization': `Bearer ${token}` } })
  ]);

  const bajoStock = await respBajoStock.json();
  const proximosVencer = await respVencer.json();

  let html = '';
    if (bajoStock.length > 0) {
    html += `<div class="alerta alerta-stock-bajo">${bajoStock.length} producto(s) en o por debajo del stock mínimo: ${bajoStock.map(p => escaparHTML(p.nombre)).join(', ')}</div>`;
  }
  if (proximosVencer.length > 0) {
    html += `<div class="alerta alerta-vencimiento">${proximosVencer.length} producto(s) próximos a vencer (30 días): ${proximosVencer.map(p => escaparHTML(p.nombre)).join(', ')}</div>`;
  }
  alertasStock.innerHTML = html;
}

// ---- Cargar y pintar tabla de productos ----
async function cargarProductos() {
  mostrarCargando(tablaProductos, 6);
  try {
    const respuesta = await fetch(`${API_URL}/api/productos`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (respuesta.status === 401 || respuesta.status === 403) {
      window.location.href = 'index.html';
      return;
    }

    productos = await respuesta.json();
    pintarTabla(productos);
    cargarAlertas();

  } catch (error) {
    console.error(error);
    tablaProductos.innerHTML = `<tr><td colspan="6" class="tabla-vacia">No se pudo conectar con el servidor</td></tr>`;
  }
}

function pintarTabla(lista) {
  if (lista.length === 0) {
    tablaProductos.innerHTML = `<tr><td colspan="6" class="tabla-vacia">No hay productos registrados</td></tr>`;
    return;
  }

    tablaProductos.innerHTML = lista.map(p => {
    const bajoStock = Number(p.cantidad_disponible) <= Number(p.stock_minimo);
    return `
      <tr class="${bajoStock ? 'fila-stock-bajo' : ''}">
        <td>${escaparHTML(p.nombre)}</td>
        <td>${escaparHTML(p.categoria)}</td>
        <td>$${Number(p.precio).toLocaleString()}</td>
        <td>${p.cantidad_disponible} ${escaparHTML(p.unidad_medida)}</td>
        <td>${p.fecha_vencimiento ? p.fecha_vencimiento.split('T')[0] : '-'}</td>
        <td>
          <button class="btn-icono" onclick="abrirMovimiento(${p.id_producto}, '${p.nombre.replace(/'/g, "\\'")}', 'entrada')">Entrada</button>
          <button class="btn-icono" onclick="abrirMovimiento(${p.id_producto}, '${p.nombre.replace(/'/g, "\\'")}', 'salida')">Salida</button>
          <button class="btn-icono" onclick="editarProducto(${p.id_producto})">Editar</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ---- Buscador ----
let temporizadorBusqueda;
inputBuscar.addEventListener('input', () => {
  clearTimeout(temporizadorBusqueda);
  temporizadorBusqueda = setTimeout(async () => {
    const termino = inputBuscar.value.trim();
    if (termino === '') {
      cargarProductos();
      return;
    }
    const respuesta = await fetch(`${API_URL}/api/productos/buscar?q=${encodeURIComponent(termino)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    pintarTabla(await respuesta.json());
  }, 350);
});

// ==================== MODAL PRODUCTO ====================

document.getElementById('btnNuevoProducto').addEventListener('click', () => {
  formProducto.reset();
  document.getElementById('idProducto').value = '';
  tituloModalProducto.textContent = 'Nuevo producto';
  mensajeErrorProducto.textContent = '';
  modalProducto.classList.remove('oculto');
});

async function editarProducto(id_producto) {
  const respuesta = await fetch(`${API_URL}/api/productos/${id_producto}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const producto = await respuesta.json();

  document.getElementById('idProducto').value = producto.id_producto;
  document.getElementById('nombreProducto').value = producto.nombre || '';
  selectCategoria.value = producto.id_categoria;
  document.getElementById('precio').value = producto.precio;
  document.getElementById('unidadMedida').value = producto.unidad_medida || '';
  document.getElementById('stockMinimo').value = producto.stock_minimo || 0;
  document.getElementById('fechaVencimiento').value = producto.fecha_vencimiento ? producto.fecha_vencimiento.split('T')[0] : '';
  document.getElementById('descripcionProducto').value = producto.descripcion || '';

  tituloModalProducto.textContent = 'Editar producto';
  mensajeErrorProducto.textContent = '';
  modalProducto.classList.remove('oculto');
}

document.getElementById('btnCancelarProducto').addEventListener('click', () => {
  modalProducto.classList.add('oculto');
});

formProducto.addEventListener('submit', async (e) => {
  e.preventDefault();
  mensajeErrorProducto.textContent = '';

  const id_producto = document.getElementById('idProducto').value;
  const datos = {
    nombre: document.getElementById('nombreProducto').value,
    id_categoria: selectCategoria.value,
    precio: document.getElementById('precio').value,
    unidad_medida: document.getElementById('unidadMedida').value || 'unidad',
    stock_minimo: document.getElementById('stockMinimo').value || 0,
    fecha_vencimiento: document.getElementById('fechaVencimiento').value || null,
    descripcion: document.getElementById('descripcionProducto').value || null
  };

  const esEdicion = id_producto !== '';
  const url = esEdicion ? `${API_URL}/api/productos/${id_producto}` : `${API_URL}/api/productos`;
  const metodo = esEdicion ? 'PUT' : 'POST';

  try {
    const respuesta = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(datos)
    });
    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      mensajeErrorProducto.textContent = resultado.mensaje || 'Ocurrió un error al guardar';
      return;
    }

    modalProducto.classList.add('oculto');
    cargarProductos();

  } catch (error) {
    mensajeErrorProducto.textContent = 'No se pudo conectar con el servidor';
  }
});

// ==================== MODAL MOVIMIENTO (entrada/salida) ====================

function abrirMovimiento(id_producto, nombreProducto, tipo) {
  formMovimiento.reset();
  document.getElementById('idProductoMovimiento').value = id_producto;
  document.getElementById('tipoMovimiento').value = tipo;
  productoMovimientoNombre.textContent = `Producto: ${nombreProducto}`;
  tituloModalMovimiento.textContent = tipo === 'entrada' ? 'Registrar entrada' : 'Registrar salida';
  mensajeErrorMovimiento.textContent = '';

  grupoCostoUnitario.style.display = tipo === 'entrada' ? 'block' : 'none';

  selectMotivo.innerHTML = motivosPorTipo[tipo]
    .map(m => `<option value="${m}">${m.replace('_', ' ')}</option>`)
    .join('');

  modalMovimiento.classList.remove('oculto');
}

document.getElementById('btnCancelarMovimiento').addEventListener('click', () => {
  modalMovimiento.classList.add('oculto');
});

formMovimiento.addEventListener('submit', async (e) => {
  e.preventDefault();
  mensajeErrorMovimiento.textContent = '';

  const tipo = document.getElementById('tipoMovimiento').value;
  const id_producto = document.getElementById('idProductoMovimiento').value;

  const datos = {
    id_producto,
    cantidad: document.getElementById('cantidadMovimiento').value,
    motivo: selectMotivo.value
  };

  if (tipo === 'entrada') {
    datos.costo_unitario = document.getElementById('costoUnitario').value || 0;
  }

  try {
    const respuesta = await fetch(`${API_URL}/api/movimientos/${tipo}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(datos)
    });
    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      // Aquí aparece, por ejemplo, "La cantidad solicitada supera las existencias disponibles" (CU10)
      mensajeErrorMovimiento.textContent = resultado.mensaje || 'Ocurrió un error al registrar el movimiento';
      return;
    }

    modalMovimiento.classList.add('oculto');
    cargarProductos(); // recarga la tabla para reflejar el nuevo stock

  } catch (error) {
    mensajeErrorMovimiento.textContent = 'No se pudo conectar con el servidor';
  }
});

// ---- Carga inicial ----
cargarCategorias();
cargarProductos();