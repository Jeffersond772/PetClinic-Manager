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
const listaPendientesDashboard = document.getElementById('listaPendientesDashboard');

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
    const tarjetas = [];

    if (r.ingresos !== undefined) {
      tarjetas.push({ clase: 'acento-verde', destino: destinoTarjeta.ingresos, valor: `$${r.ingresos.toLocaleString()}`, etiqueta: 'Ingresos del mes' });
    }
    if (r.gastos !== undefined) {
      tarjetas.push({ clase: 'acento-rojo', destino: destinoTarjeta.gastos, valor: `$${r.gastos.toLocaleString()}`, etiqueta: 'Gastos del mes' });
    }
    tarjetas.push({ clase: 'acento-azul', destino: destinoTarjeta.citas, valor: r.citasAtendidas, etiqueta: 'Citas atendidas' });
    tarjetas.push({ clase: 'acento-rojo', destino: destinoTarjeta.stock, valor: r.productosBajoStock, etiqueta: 'Productos bajo stock' });

    tarjetasResumenDashboard.innerHTML = tarjetas.map((t, i) => `
      <div class="tarjeta-kpi ${t.clase} clickeable" style="animation-delay:${i * 0.05}s" data-destino="${t.destino}">
        <div class="valor-kpi">${t.valor}</div>
        <div class="etiqueta-kpi">${t.etiqueta}</div>
      </div>
    `).join('');

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

  async function cargarPendientes() {
    if (!listaPendientesDashboard) return;
    try {
      const respuesta = await fetch(`${API_URL}/api/reportes/pendientes`, { headers: { 'Authorization': `Bearer ${token}` } });
      const p = await respuesta.json();
      const secciones = [];
      if (p.citasEnAtencion?.length) secciones.push(`<h4>Consultas sin finalizar (${p.citasEnAtencion.length})</h4><ul>${p.citasEnAtencion.map(c => `<li><a href="citas.html">${escaparHTML(c.paciente)} · ${escaparHTML(c.veterinario)} · ${String(c.hora).slice(0,5)}</a></li>`).join('')}</ul>`);
      if (p.seguimientos?.length) secciones.push(`<h4>Vacunas y controles próximos o vencidos (${p.seguimientos.length})</h4><ul>${p.seguimientos.map(s => `<li><a href="historia.html?id_paciente=${encodeURIComponent(s.id_paciente)}">${escaparHTML(s.paciente)} · ${escaparHTML(s.tipo)} · ${String(s.fecha_proxima).slice(0,10)}</a></li>`).join('')}</ul>`);
      if (p.productosBajoStock?.length) secciones.push(`<h4>Productos para reponer (${p.productosBajoStock.length})</h4><ul>${p.productosBajoStock.map(x => `<li><a href="productos.html">${escaparHTML(x.nombre)} · ${x.cantidad_disponible} disponibles</a></li>`).join('')}</ul>`);
      listaPendientesDashboard.innerHTML = secciones.join('') || '<p class="texto-secundario">No hay pendientes por atender.</p>';
    } catch (error) {
      console.error('Error cargando pendientes:', error);
      listaPendientesDashboard.innerHTML = '<p class="texto-secundario">No se pudieron cargar los pendientes.</p>';
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
        consultas.porDia.forEach(d => { d.dia = d.dia.slice(0, 10); });
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
        ingresos.forEach(i => { i.dia = i.dia.slice(0, 10); });
        gastos.forEach(g => { g.dia = g.dia.slice(0, 10); });
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
  cargarPendientes();
  cargarGraficosDashboard();
}