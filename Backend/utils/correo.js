const nodemailer = require('nodemailer');

const transportador = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  family: 4, // fuerza IPv4; evita que se cuelgue intentando IPv6
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function enviarCorreo({ para, asunto, html }) {
  await transportador.sendMail({
    from: `"${process.env.EMAIL_FROM_NOMBRE || 'PetClinic Manager'}" <${process.env.EMAIL_USER}>`,
    to: para,
    subject: asunto,
    html
  });
}

module.exports = { enviarCorreo };