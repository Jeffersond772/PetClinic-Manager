const nodemailer = require('nodemailer');

const transportador = nodemailer.createTransport({
  service: 'gmail',
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