const filtroDesde = document.getElementById('filtroDesde');
const filtroHasta = document.getElementById('filtroHasta');
const tarjetasResumen = document.getElementById('tarjetasResumen');

let graficoFinanciero, graficoConsultas, graficoProductos, graficoFlujoCaja;
let datosExportables = { hojas: [], desde: '', hasta: '' };

const dinero = (n) => '$' + Number(n).toLocaleString('es-CO', { maximumFractionDigits: 0 });

function pintarGanancia(g) {
  const margen = g.ventas > 0 ? ((g.ganancia / g.ventas) * 100).toFixed(1) + '%' : '-';
  document.getElementById('tarjetasGanancia').innerHTML = `
    <div class="tarjeta-kpi acento-azul"><div class="valor-kpi">${dinero(g.ventas)}</div><div class="etiqueta-kpi">Ventas facturadas</div></div>
    <div class="tarjeta-kpi ${g.ganancia >= 0 ? 'acento-verde' : 'acento-rojo'}"><div class="valor-kpi">${dinero(g.ganancia)}</div><div class="etiqueta-kpi">Ganancia real (margen ${margen})</div></div>
  `;
}

function armarHojas(g, rent, compras, servicios, citasVet) {
  return [
    { titulo: 'Ganancia real', soloExportar: true,
      columnas: [{ t: 'Concepto' }, { t: 'Valor', f: dinero }],
      filas: [['Ventas facturadas', g.ventas], ['Costo de lo vendido', g.costoMercancia],
              ['Gastos operativos', g.gastos], ['Ganancia real', g.ganancia], ['Cobrado en el período', g.cobrado]] },
    { titulo: 'Rentabilidad por producto',
      columnas: [{ t: 'Producto' }, { t: 'Unidades' }, { t: 'Ingresos', f: dinero }, { t: 'Costo', f: dinero },
                 { t: 'Ganancia', f: dinero }, { t: 'Margen', f: v => v === null ? '-' : v.toFixed(1) + '%' }],
      filas: rent.map(r => {
        const ingresos = Number(r.ingresos), costo = Number(r.costo), ganancia = ingresos - costo;
        return [r.nombre, Number(r.unidades), ingresos, costo, ganancia, (costo > 0 && ingresos > 0) ? (ganancia / ingresos) * 100 : null];
      }) },
    { titulo: 'Compras por proveedor',
      columnas: [{ t: 'Proveedor' }, { t: 'Compras' }, { t: 'Total comprado', f: dinero }],
      filas: compras.map(c => [c.nombre, Number(c.compras), Number(c.total)]) },
    { titulo: 'Ingresos por servicio',
      columnas: [{ t: 'Servicio' }, { t: 'Veces' }, { t: 'Total', f: dinero }],
      filas: servicios.map(s => [s.nombre, Number(s.veces), Number(s.total)]) },
    { titulo: 'Citas por veterinario',
      columnas: [{ t: 'Veterinario' }, { t: 'Total' }, { t: 'Atendidas' }, { t: 'Programadas' }, { t: 'Canceladas' }, { t: 'No asistió' }],
      filas: citasVet.map(c => [c.nombre, Number(c.total), Number(c.atendidas), Number(c.programadas), Number(c.canceladas), Number(c.no_asistio)]) }
  ];
}

function pintarTablasReporte(hojas) {
  document.getElementById('tablasReporte').innerHTML = hojas.filter(h => !h.soloExportar).map(h => `
    <div class="tarjeta-grafico">
      <h3>${escaparHTML(h.titulo)}</h3>
      <div style="overflow-x:auto">
        <table class="tabla-datos">
          <thead><tr>${h.columnas.map(c => `<th>${escaparHTML(c.t)}</th>`).join('')}</tr></thead>
          <tbody>${h.filas.length === 0
            ? `<tr><td colspan="${h.columnas.length}" class="tabla-vacia">Sin datos en este período</td></tr>`
            : h.filas.map(f => `<tr>${f.map((v, i) => `<td>${escaparHTML(h.columnas[i].f ? h.columnas[i].f(v) : v)}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`).join('');
}

function exportarExcel() {
  const libro = XLSX.utils.book_new();
  datosExportables.hojas.forEach(h => {
    const datos = [h.columnas.map(c => c.t), ...h.filas];
    XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(datos), h.titulo.slice(0, 31));
  });
  XLSX.writeFile(libro, `Reporte_${datosExportables.desde}_a_${datosExportables.hasta}.xlsx`);
}

function exportarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const { hojas, desde, hasta } = datosExportables;
  let y = 20;

  doc.setFontSize(18); doc.setTextColor(29, 158, 117);
  doc.text('PetClinic Manager - Reporte', 14, y);
  y += 7; doc.setFontSize(10); doc.setTextColor(100);
  doc.text(`Período: ${desde} a ${hasta}`, 14, y);
  y += 12;

  hojas.forEach(h => {
    const unidad = 182 / (h.columnas.length + 1);
    const anchos = h.columnas.map((_, i) => i === 0 ? unidad * 2 : unidad);
    const xs = []; let acum = 16;
    anchos.forEach(a => { xs.push(acum); acum += a; });

    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(12); doc.setTextColor(30);
    doc.text(h.titulo, 14, y); y += 6;

    doc.setFillColor(244, 247, 246); doc.rect(14, y - 4.5, 182, 7, 'F');
    doc.setFontSize(8.5); doc.setTextColor(90);
    h.columnas.forEach((c, i) => doc.text(c.t, xs[i], y));
    y += 7; doc.setTextColor(30);

    if (h.filas.length === 0) { doc.text('Sin datos en este período', 16, y); y += 7; }
    h.filas.forEach(fila => {
      if (y > 280) { doc.addPage(); y = 20; }
      fila.forEach((v, i) => {
        const texto = String(h.columnas[i].f ? h.columnas[i].f(v) : v);
        doc.text(texto.slice(0, Math.floor(anchos[i] / 1.8)), xs[i], y);
      });
      y += 6;
    });
    y += 8;
  });

  doc.save(`Reporte_${desde}_a_${hasta}.pdf`);
}

document.getElementById('btnExportarExcel').addEventListener('click', exportarExcel);
document.getElementById('btnExportarPDF').addEventListener('click', exportarPDF);

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
  const pedir = (ruta) => fetch(`${API_URL}/api/reportes/${ruta}?desde=${desde}&hasta=${hasta}`, { headers: { 'Authorization': `Bearer ${token}` } });

  const [resResumen, resIngresos, resGastos, resConsultas, resProductos,
         resGanancia, resRentabilidad, resCompras, resServicios, resCitasVet] = await Promise.all([
    pedir('resumen'), pedir('ingresos'), pedir('gastos'), pedir('consultas'), pedir('productos-movimiento'),
    pedir('ganancia'), pedir('rentabilidad'), pedir('compras-proveedor'), pedir('ingresos-servicio'), pedir('citas-veterinario')
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
  const ganancia = await resGanancia.json();
  const rentabilidad = await resRentabilidad.json();
  const compras = await resCompras.json();
  const servicios = await resServicios.json();
  const citasVet = await resCitasVet.json();

  ingresos.forEach(i => { i.dia = i.dia.slice(0, 10); });
  gastos.forEach(g => { g.dia = g.dia.slice(0, 10); });
  consultas.porDia.forEach(d => { d.dia = d.dia.slice(0, 10); });

  pintarTarjetas(resumen);
  pintarGanancia(ganancia);
  pintarGraficoFinanciero(ingresos, gastos);
  pintarGraficoFlujoCaja(ingresos, gastos);
  pintarGraficoConsultas(consultas.porDia);
  pintarGraficoProductos(productos);

  const hojas = armarHojas(ganancia, rentabilidad, compras, servicios, citasVet);
  datosExportables = { hojas, desde, hasta };
  pintarTablasReporte(hojas);
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