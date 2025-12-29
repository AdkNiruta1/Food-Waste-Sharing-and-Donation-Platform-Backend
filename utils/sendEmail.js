import nodemailer from "nodemailer";
// Utility to send emails
export const sendEmail = async ({ to, subject, html }) => {
  // Create transporter
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
// Send email
  await transporter.sendMail({
    from: `"Annapurna Bhandar" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};
