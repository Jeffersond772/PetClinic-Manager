const tablaGastos = document.getElementById('tablaGastos');
const modalGasto = document.getElementById('modalGasto');
const formGasto = document.getElementById('formGasto');
const mensajeErrorGasto = document.getElementById('mensajeErrorGasto');

async function cargarGastos() {
  mostrarCargando(tablaGastos, 5);
  try {
    const respuesta = await fetch(`${API_URL}/api/gastos`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (respuesta.status === 401 || respuesta.status === 403) {
      window.location.href = 'index.html';
      return;
    }

    const gastos = await respuesta.json();
    pintarTabla(gastos);

  } catch (error) {
    console.error(error);
    tablaGastos.innerHTML = `<tr><td colspan="5" class="tabla-vacia">No se pudo conectar con el servidor</td></tr>`;
  }
}

function pintarTabla(gastos) {
  if (gastos.length === 0) {
    tablaGastos.innerHTML = `<tr><td colspan="5" class="tabla-vacia">No hay gastos registrados</td></tr>`;
    return;
  }

  tablaGastos.innerHTML = gastos.map(g => `
    <tr>
      <td>${g.fecha.split('T')[0]}</td>
      <td>${g.concepto}</td>
      <td>${g.categoria || '-'}</td>
      <td>$${Number(g.monto).toLocaleString()}</td>
      <td>${g.registrado_por}</td>
    </tr>
  `).join('');
}

document.getElementById('btnNuevoGasto').addEventListener('click', () => {
  formGasto.reset();
  document.getElementById('fechaGasto').value = new Date().toISOString().split('T')[0];
  mensajeErrorGasto.textContent = '';
  modalGasto.classList.remove('oculto');
});

document.getElementById('btnCancelarGasto').addEventListener('click', () => {
  modalGasto.classList.add('oculto');
});

formGasto.addEventListener('submit', async (e) => {
  e.preventDefault();
  mensajeErrorGasto.textContent = '';

  const datos = {
    concepto: document.getElementById('conceptoGasto').value,
    categoria: document.getElementById('categoriaGasto').value || null,
    monto: document.getElementById('montoGasto').value,
    fecha: document.getElementById('fechaGasto').value
  };

  try {
    const respuesta = await fetch(`${API_URL}/api/gastos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(datos)
    });
    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      mensajeErrorGasto.textContent = resultado.mensaje || 'Ocurrió un error al guardar';
      return;
    }

    modalGasto.classList.add('oculto');
    cargarGastos();

  } catch (error) {
    mensajeErrorGasto.textContent = 'No se pudo conectar con el servidor';
  }
});

cargarGastos();