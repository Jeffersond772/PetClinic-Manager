const filtroDesde = document.getElementById('filtroDesde');
const filtroHasta = document.getElementById('filtroHasta');
const tarjetasResumen = document.getElementById('tarjetasResumen');

let graficoFinanciero, graficoConsultas, graficoProductos, graficoFlujoCaja;

function formatearFecha(fecha) {
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

// ==================== CARGA PRINCIPAL ====================

async function cargarReportes() {
  const desde = filtroDesde.value;
  const hasta = filtroHasta.value;

  const [resResumen, resIngresos, resGastos, resConsultas, resProductos] = await Promise.all([
    fetch(`${API_URL}/api/reportes/resumen?desde=${desde}&hasta=${hasta}`, { headers: { 'Authorization': `Bearer ${token}` } }),
    fetch(`${API_URL}/api/reportes/ingresos?desde=${desde}&hasta=${hasta}`, { headers: { 'Authorization': `Bearer ${token}` } }),
    fetch(`${API_URL}/api/reportes/gastos?desde=${desde}&hasta=${hasta}`, { headers: { 'Authorization': `Bearer ${token}` } }),
    fetch(`${API_URL}/api/reportes/consultas?desde=${desde}&hasta=${hasta}`, { headers: { 'Authorization': `Bearer ${token}` } }),
    fetch(`${API_URL}/api/reportes/productos-movimiento?desde=${desde}&hasta=${hasta}`, { headers: { 'Authorization': `Bearer ${token}` } })
  ]);

  if (resResumen.status === 401 || resResumen.status === 403) {
    window.location.href = 'index.html';
    return;
  }

  const resumen = await resResumen.json();
  const ingresos = await resIngresos.json();
  const gastos = await resGastos.json();
  const consultas = await resConsultas.json();
  const productos = await resProductos.json();

  pintarTarjetas(resumen);
  pintarGraficoFinanciero(ingresos, gastos);
  pintarGraficoFlujoCaja(ingresos, gastos);
  pintarGraficoConsultas(consultas.porDia);
  pintarGraficoProductos(productos);
}

function pintarTarjetas(r) {
  tarjetasResumen.innerHTML = `
    <div class="tarjeta-kpi acento-verde" style="animation-delay:0s">
      <div class="valor-kpi">$${r.ingresos.toLocaleString()}</div>
      <div class="etiqueta-kpi">Ingresos</div>
    </div>
    <div class="tarjeta-kpi acento-rojo" style="animation-delay:0.05s">
      <div class="valor-kpi">$${r.gastos.toLocaleString()}</div>
      <div class="etiqueta-kpi">Gastos operativos</div>
    </div>
    <div class="tarjeta-kpi acento-rojo" style="animation-delay:0.1s">
      <div class="valor-kpi">$${r.costoMercancia.toLocaleString()}</div>
      <div class="etiqueta-kpi">Costo de mercancía</div>
    </div>
    <div class="tarjeta-kpi ${r.utilidadBruta >= 0 ? 'acento-verde' : 'acento-rojo'}" style="animation-delay:0.15s">
      <div class="valor-kpi">$${r.utilidadBruta.toLocaleString()}</div>
      <div class="etiqueta-kpi">Utilidad bruta</div>
    </div>
    <div class="tarjeta-kpi acento-azul" style="animation-delay:0.2s">
      <div class="valor-kpi">${r.citasAtendidas}</div>
      <div class="etiqueta-kpi">Citas atendidas</div>
    </div>
    <div class="tarjeta-kpi acento-rojo" style="animation-delay:0.25s">
      <div class="valor-kpi">${r.productosBajoStock}</div>
      <div class="etiqueta-kpi">Productos bajo stock</div>
    </div>
    <div class="tarjeta-kpi acento-rojo" style="animation-delay:0.3s">
      <div class="valor-kpi">$${r.deudasPendientes.toLocaleString()}</div>
      <div class="etiqueta-kpi">Deudas pendientes</div>
    </div>
  `;
}

// ==================== GRÁFICOS ====================

function pintarGraficoFinanciero(ingresos, gastos) {
  const dias = [...new Set([...ingresos.map(i => i.dia), ...gastos.map(g => g.dia)])].sort();
  const datosIngresos = dias.map(d => Number(ingresos.find(i => i.dia === d)?.total || 0));
  const datosGastos = dias.map(d => Number(gastos.find(g => g.dia === d)?.total || 0));

  if (graficoFinanciero) graficoFinanciero.destroy();
  graficoFinanciero = new Chart(document.getElementById('graficoFinanciero'), {
    type: 'line',
    data: {
      labels: dias.map(d => d.split('-').slice(1).reverse().join('/')),
      datasets: [
        { label: 'Ingresos', data: datosIngresos, borderColor: '#1d9e75', backgroundColor: 'rgba(29,158,117,0.1)', fill: true, tension: 0.3 },
        { label: 'Gastos', data: datosGastos, borderColor: '#d64545', backgroundColor: 'rgba(214,69,69,0.1)', fill: true, tension: 0.3 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, animation: { duration: 700 } }
  });
}

function pintarGraficoFlujoCaja(ingresos, gastos) {
  const dias = [...new Set([...ingresos.map(i => i.dia), ...gastos.map(g => g.dia)])].sort();
  let acumulado = 0;
  const netoDiario = [];
  const saldoAcumulado = [];

  dias.forEach(d => {
    const ing = Number(ingresos.find(i => i.dia === d)?.total || 0);
    const gas = Number(gastos.find(g => g.dia === d)?.total || 0);
    const neto = ing - gas;
    acumulado += neto;
    netoDiario.push(neto);
    saldoAcumulado.push(acumulado);
  });

  if (graficoFlujoCaja) graficoFlujoCaja.destroy();
  graficoFlujoCaja = new Chart(document.getElementById('graficoFlujoCaja'), {
    data: {
      labels: dias.map(d => d.split('-').slice(1).reverse().join('/')),
      datasets: [
        {
          type: 'bar',
          label: 'Flujo neto diario',
          data: netoDiario,
          backgroundColor: netoDiario.map(v => v >= 0 ? 'rgba(29,158,117,0.6)' : 'rgba(214,69,69,0.6)'),
          borderRadius: 4
        },
        {
          type: 'line',
          label: 'Saldo acumulado',
          data: saldoAcumulado,
          borderColor: '#1d5fa8',
          backgroundColor: 'transparent',
          tension: 0.3
        }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, animation: { duration: 700 } }
  });
}

function pintarGraficoConsultas(porDia) {
  if (graficoConsultas) graficoConsultas.destroy();
  graficoConsultas = new Chart(document.getElementById('graficoConsultas'), {
    type: 'bar',
    data: {
      labels: porDia.map(d => d.dia.split('-').slice(1).reverse().join('/')),
      datasets: [{ label: 'Consultas', data: porDia.map(d => d.total), backgroundColor: '#1d5fa8', borderRadius: 6 }]
    },
    options: { responsive: true, maintainAspectRatio: false, animation: { duration: 700 } }
  });
}

function pintarGraficoProductos(productos) {
  if (graficoProductos) graficoProductos.destroy();
  graficoProductos = new Chart(document.getElementById('graficoProductos'), {
    type: 'bar',
    data: {
      labels: productos.map(p => p.nombre),
      datasets: [{ label: 'Unidades movidas', data: productos.map(p => p.total_movido), backgroundColor: '#eaa221', borderRadius: 6 }]
    },
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: { duration: 700 } }
  });
}

// ==================== FILTROS RÁPIDOS ====================

document.getElementById('btnMesActual').addEventListener('click', () => {
  const hoy = new Date();
  filtroDesde.value = formatearFecha(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  filtroHasta.value = formatearFecha(hoy);
  cargarReportes();
});

document.getElementById('btnUltimos30').addEventListener('click', () => {
  const hoy = new Date();
  const hace30 = new Date();
  hace30.setDate(hoy.getDate() - 30);
  filtroDesde.value = formatearFecha(hace30);
  filtroHasta.value = formatearFecha(hoy);
  cargarReportes();
});

filtroDesde.addEventListener('change', cargarReportes);
filtroHasta.addEventListener('change', cargarReportes);

// ---- Carga inicial: mes actual ----
document.getElementById('btnMesActual').click();