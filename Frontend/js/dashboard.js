const elSaludo = document.getElementById('saludo');
if (elSaludo) {
  elSaludo.textContent = `Bienvenido, ${usuario.nombre}`;
}

function formatearFecha(fecha) {
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

const tarjetasResumenDashboard = document.getElementById('tarjetasResumenDashboard');
const elFechaHoy = document.getElementById('fechaHoy');

// Solo corre el resto si estos elementos existen (es decir, si estamos en dashboard.html)
if (tarjetasResumenDashboard) {

  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const desde = formatearFecha(inicioMes);
  const hasta = formatearFecha(hoy);

  elFechaHoy.textContent = hoy.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  async function cargarResumenDashboard() {
    try {
      const respuesta = await fetch(`${API_URL}/api/reportes/resumen?desde=${desde}&hasta=${hasta}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const r = await respuesta.json();
      pintarTarjetasDashboard(r);
    } catch (error) {
      console.error('Error cargando resumen del dashboard:', error);
    }
  }

  function pintarTarjetasDashboard(r) {
    tarjetasResumenDashboard.innerHTML = `
      <div class="tarjeta-kpi acento-verde" style="animation-delay:0s">
        <div class="valor-kpi">$${r.ingresos.toLocaleString()}</div>
        <div class="etiqueta-kpi">Ingresos del mes</div>
      </div>
      <div class="tarjeta-kpi acento-rojo" style="animation-delay:0.05s">
        <div class="valor-kpi">$${r.gastos.toLocaleString()}</div>
        <div class="etiqueta-kpi">Gastos del mes</div>
      </div>
      <div class="tarjeta-kpi acento-azul" style="animation-delay:0.1s">
        <div class="valor-kpi">${r.citasAtendidas}</div>
        <div class="etiqueta-kpi">Citas atendidas</div>
      </div>
      <div class="tarjeta-kpi acento-rojo" style="animation-delay:0.15s">
        <div class="valor-kpi">${r.productosBajoStock}</div>
        <div class="etiqueta-kpi">Productos bajo stock</div>
      </div>
    `;
  }

  // Solo si Chart.js está disponible y hay permisos para reportes financieros detallados
  async function cargarGraficosDashboard() {
    if (usuario.rol !== 'Administrador' && usuario.rol !== 'Veterinario') return;

    try {
      const promesas = [
        fetch(`${API_URL}/api/reportes/consultas?desde=${desde}&hasta=${hasta}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ];

      if (usuario.rol === 'Administrador') {
        promesas.push(
          fetch(`${API_URL}/api/reportes/ingresos?desde=${desde}&hasta=${hasta}`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_URL}/api/reportes/gastos?desde=${desde}&hasta=${hasta}`, { headers: { 'Authorization': `Bearer ${token}` } })
        );
      }

      const respuestas = await Promise.all(promesas);
      const consultas = await respuestas[0].json();

      new Chart(document.getElementById('graficoConsultasDashboard'), {
        type: 'bar',
        data: {
          labels: consultas.porDia.map(d => d.dia.split('-').slice(1).reverse().join('/')),
          datasets: [{ label: 'Consultas', data: consultas.porDia.map(d => d.total), backgroundColor: '#1d5fa8', borderRadius: 6 }]
        },
        options: { responsive: true, maintainAspectRatio: false, animation: { duration: 700 } }
      });

      if (usuario.rol === 'Administrador') {
        const ingresos = await respuestas[1].json();
        const gastos = await respuestas[2].json();
        const dias = [...new Set([...ingresos.map(i => i.dia), ...gastos.map(g => g.dia)])].sort();

        new Chart(document.getElementById('graficoFinancieroDashboard'), {
          type: 'line',
          data: {
            labels: dias.map(d => d.split('-').slice(1).reverse().join('/')),
            datasets: [
              { label: 'Ingresos', data: dias.map(d => Number(ingresos.find(i => i.dia === d)?.total || 0)), borderColor: '#1d9e75', backgroundColor: 'rgba(29,158,117,0.1)', fill: true, tension: 0.3 },
              { label: 'Gastos', data: dias.map(d => Number(gastos.find(g => g.dia === d)?.total || 0)), borderColor: '#d64545', backgroundColor: 'rgba(214,69,69,0.1)', fill: true, tension: 0.3 }
            ]
          },
          options: { responsive: true, maintainAspectRatio: false, animation: { duration: 700 } }
        });
      } else {
        // Empleado y Veterinario no ven el gráfico financiero: ocultamos su tarjeta
        document.getElementById('graficoFinancieroDashboard').closest('.tarjeta-grafico').style.display = 'none';
      }

    } catch (error) {
      console.error('Error cargando gráficos del dashboard:', error);
    }
  }

  cargarResumenDashboard();
  cargarGraficosDashboard();
}