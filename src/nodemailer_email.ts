import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PWD,
  },
});

export async function sendEmailNodemailer(
  to: string,
  subject: string,
  html: string,
) {
  try {
    await transporter.sendMail({
      from: `"Fluenzy Support"<${process.env.SMTP_USER}>`,
      to: to,
      subject: subject,
      html: html,
    });
    console.log(`📧 Email sent to ${to}`);
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
}
