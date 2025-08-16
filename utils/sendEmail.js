const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  if (!options.email || !options.subject || !options.message) {
    throw new Error("Email, subject, and message are required");
  }
  const transport = nodemailer.createTransport({
    host: process.env.SMPT_HOST,
    port: process.env.SMPT_PORT,
    auth: {
      user: process.env.SMPT_EMAIL,
      pass: process.env.SMPT_PASS,
    },
  });

  const message = {
    from: `${process.env.SMPT_FROM_NAME} <${process.env.SMPT_FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html || undefined,
  };

  try {
    await transport.sendMail(message);
  } catch (err) {
    throw new Error("Failed to send email: " + err.message);
  }
};
module.exports = sendEmail;
