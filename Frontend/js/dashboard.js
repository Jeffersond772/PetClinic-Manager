const elSaludo = document.getElementById('saludo');

function obtenerSaludoHora() {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

if (elSaludo) {
  elSaludo.textContent = `${obtenerSaludoHora()}, ${usuario.nombre}`;
}

function formatearFecha(fecha) {
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

const tarjetasResumenDashboard = document.getElementById('tarjetasResumenDashboard');
const elFechaHoy = document.getElementById('fechaHoy');
const listaProximasCitas = document.getElementById('listaProximasCitas');

if (tarjetasResumenDashboard) {

  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const desde = formatearFecha(inicioMes);
  const hasta = formatearFecha(hoy);
  const hoyStr = formatearFecha(hoy);

  elFechaHoy.textContent = hoy.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const destinoTarjeta = {
    ingresos: 'cuentas.html',
    gastos: 'gastos.html',
    citas: 'citas.html',
    stock: 'productos.html'
  };

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
      <div class="tarjeta-kpi acento-verde clickeable" style="animation-delay:0s" data-destino="${destinoTarjeta.ingresos}">
        <div class="valor-kpi">$${r.ingresos.toLocaleString()}</div>
        <div class="etiqueta-kpi">Ingresos del mes</div>
      </div>
      <div class="tarjeta-kpi acento-rojo clickeable" style="animation-delay:0.05s" data-destino="${destinoTarjeta.gastos}">
        <div class="valor-kpi">$${r.gastos.toLocaleString()}</div>
        <div class="etiqueta-kpi">Gastos del mes</div>
      </div>
      <div class="tarjeta-kpi acento-azul clickeable" style="animation-delay:0.1s" data-destino="${destinoTarjeta.citas}">
        <div class="valor-kpi">${r.citasAtendidas}</div>
        <div class="etiqueta-kpi">Citas atendidas</div>
      </div>
      <div class="tarjeta-kpi acento-rojo clickeable" style="animation-delay:0.15s" data-destino="${destinoTarjeta.stock}">
        <div class="valor-kpi">${r.productosBajoStock}</div>
        <div class="etiqueta-kpi">Productos bajo stock</div>
      </div>
    `;

    tarjetasResumenDashboard.querySelectorAll('.clickeable').forEach(tarjeta => {
      tarjeta.addEventListener('click', () => {
        window.location.href = tarjeta.dataset.destino;
      });
    });
  }

  async function cargarProximasCitas() {
    if (!listaProximasCitas) return;
    try {
      const respuesta = await fetch(`${API_URL}/api/citas/agenda?desde=${hoyStr}&hasta=${hoyStr}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resultado = await respuesta.json();
      const citas = (resultado.citas || []).filter(c => c.estado === 'programada');

      if (citas.length === 0) {
        listaProximasCitas.innerHTML = `<p class="texto-secundario">No hay citas programadas para hoy.</p>`;
        return;
      }

      listaProximasCitas.innerHTML = citas.map(c => `
        <div class="item-proxima-cita">
          <span class="hora-cita">${c.hora}</span>
          <div>
            <strong>${escaparHTML(c.paciente)}</strong>
            <p class="texto-secundario">${escaparHTML(c.propietario)} · Dr(a). ${escaparHTML(c.veterinario)}</p>
          </div>
        </div>
      `).join('');

    } catch (error) {
      console.error('Error cargando próximas citas:', error);
    }
  }

    async function cargarGraficosDashboard() {
    try {
      const puedeVerConsultas = usuario.rol === 'Administrador' || usuario.rol === 'Veterinario';

      const promesas = [
        fetch(`${API_URL}/api/reportes/citas-estado?desde=${desde}&hasta=${hasta}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ];

      if (puedeVerConsultas) {
        promesas.push(fetch(`${API_URL}/api/reportes/consultas?desde=${desde}&hasta=${hasta}`, { headers: { 'Authorization': `Bearer ${token}` } }));
      }

      if (usuario.rol === 'Administrador') {
        promesas.push(
          fetch(`${API_URL}/api/reportes/ingresos?desde=${desde}&hasta=${hasta}`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_URL}/api/reportes/gastos?desde=${desde}&hasta=${hasta}`, { headers: { 'Authorization': `Bearer ${token}` } })
        );
      }

      const respuestas = await Promise.all(promesas);
      const citasEstado = await respuestas[0].json();

      const canvasCitasEstado = document.getElementById('graficoCitasEstado');
      if (canvasCitasEstado) {
        const coloresPorEstado = { programada: '#1d5fa8', atendida: '#1d9e75', cancelada: '#d64545', no_asistio: '#999999' };
        new Chart(canvasCitasEstado, {
          type: 'doughnut',
          data: {
            labels: citasEstado.map(c => c.estado.replace('_', ' ')),
            datasets: [{
              data: citasEstado.map(c => c.total),
              backgroundColor: citasEstado.map(c => coloresPorEstado[c.estado] || '#ccc')
            }]
          },
          options: { responsive: true, maintainAspectRatio: false, animation: { duration: 700 } }
        });
      }

      let indiceSiguiente = 1;

      if (puedeVerConsultas) {
        const consultas = await respuestas[indiceSiguiente].json();
        indiceSiguiente++;

        const canvasConsultas = document.getElementById('graficoConsultasDashboard');
        if (canvasConsultas) {
          new Chart(canvasConsultas, {
            type: 'bar',
            data: {
              labels: consultas.porDia.map(d => d.dia.split('-').slice(1).reverse().join('/')),
              datasets: [{ label: 'Consultas', data: consultas.porDia.map(d => d.total), backgroundColor: '#1d5fa8', borderRadius: 6 }]
            },
            options: { responsive: true, maintainAspectRatio: false, animation: { duration: 700 } }
          });
        }
      } else {
        const contenedorConsultas = document.getElementById('graficoConsultasDashboard');
        if (contenedorConsultas) contenedorConsultas.closest('.tarjeta-grafico').style.display = 'none';
      }

      if (usuario.rol === 'Administrador') {
        const ingresos = await respuestas[indiceSiguiente].json();
        const gastos = await respuestas[indiceSiguiente + 1].json();
        const dias = [...new Set([...ingresos.map(i => i.dia), ...gastos.map(g => g.dia)])].sort();

        const canvasFinanciero = document.getElementById('graficoFinancieroDashboard');
        if (canvasFinanciero) {
          new Chart(canvasFinanciero, {
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
        }
      } else {
        const contenedorFinanciero = document.getElementById('graficoFinancieroDashboard');
        if (contenedorFinanciero) contenedorFinanciero.closest('.tarjeta-grafico').style.display = 'none';
      }

    } catch (error) {
      console.error('Error cargando gráficos del dashboard:', error);
    }
  }

  cargarResumenDashboard();
  cargarProximasCitas();
  cargarGraficosDashboard();
}