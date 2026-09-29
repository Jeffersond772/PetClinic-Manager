const cron = require('node-cron');
const notificacionModel = require('../models/notificacion.model');
const citaModel = require('../models/cita.model');
const usuarioModel = require('../models/usuario.model');
const { enviarCorreo } = require('../utils/correo');
const { obtenerHoraActualLocal } = require('../utils/horario');

const TITULOS = {
  nueva: 'Nueva cita asignada',
  actualizada: 'Cita modificada',
  cancelada: 'Cita cancelada'
};

function construirHtml(tipo, cita) {
  const hora = cita.hora.slice(0, 5);
  const fecha = new Date(cita.fecha + 'T00:00:00').toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Bogota'
  });

  const mensajes = {
    nueva: 'Se te ha asignado una nueva cita:',
    actualizada: 'Una de tus citas fue modificada. Estos son sus datos actuales:',
    cancelada: 'La siguiente cita fue cancelada:'
  };

  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#1d9e75;">🐾 PetClinic Manager</h2>
      <p>${mensajes[tipo]}</p>
      <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding:6px 0; color:#777;">Paciente</td><td style="padding:6px 0; font-weight:600;">${cita.paciente}</td></tr>
        <tr><td style="padding:6px 0; color:#777;">Propietario</td><td style="padding:6px 0; font-weight:600;">${cita.propietario}</td></tr>
        <tr><td style="padding:6px 0; color:#777;">Fecha</td><td style="padding:6px 0; font-weight:600;">${fecha}</td></tr>
        <tr><td style="padding:6px 0; color:#777;">Hora</td><td style="padding:6px 0; font-weight:600;">${hora}</td></tr>
        <tr><td style="padding:6px 0; color:#777;">Motivo</td><td style="padding:6px 0;">${cita.motivo || 'No especificado'}</td></tr>
      </table>
      <p style="font-size:12px; color:#999;">Este es un correo automático, no respondas a este mensaje.</p>
    </div>
  `;
}

async function procesarPendientes() {
  const pendientes = await notificacionModel.listarPendientes();
  if (pendientes.length === 0) return;

  const horaActual = obtenerHoraActualLocal();

  for (const notificacion of pendientes) {
    try {
      const veterinario = await usuarioModel.obtenerPorId(notificacion.id_veterinario);
      if (!veterinario || !veterinario.correo) continue;

      // Respeta el horario laboral del veterinario: si está fuera, se deja
      // "pendiente" y se reintenta en la próxima pasada del cron (cada 5 min).
      const infoHorario = await usuarioModel.estaDentroDeHorarioLaboral(notificacion.id_veterinario, horaActual);
      if (infoHorario && !infoHorario.dentro) continue;

      const cita = await citaModel.obtenerPorId(notificacion.id_cita);
      if (!cita) {
        await notificacionModel.marcarEnviada(notificacion.id_notificacion); // ya no existe, descarta
        continue;
      }

      await enviarCorreo({
        para: veterinario.correo,
        asunto: `${TITULOS[notificacion.tipo]} - ${cita.paciente}`,
        html: construirHtml(notificacion.tipo, cita)
      });

      await notificacionModel.marcarEnviada(notificacion.id_notificacion);

    } catch (error) {
      console.error(`Error enviando notificación ${notificacion.id_notificacion}:`, error.message);
      await notificacionModel.registrarFallo(notificacion.id_notificacion, (notificacion.intentos || 0) + 1);
    }
  }
}

function iniciar() {
  cron.schedule('*/5 * * * *', procesarPendientes); // cada 5 minutos
  console.log('Tarea de notificaciones por correo programada (cada 5 minutos)');
}

module.exports = { iniciar };