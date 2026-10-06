import nodemailer from 'nodemailer';
import { admin } from './clients.js';

export async function ticketEmail(ticket, employeeEmail) {
  let state = 'not_configured';
  if (process.env.SMTP_HOST && process.env.SMTP_FROM) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465, requireTLS: Number(process.env.SMTP_PORT) !== 465,
        connectionTimeout: 10000, socketTimeout: 15000,
        ...(process.env.SMTP_USER ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } } : {})
      });
      await transporter.sendMail({ from: process.env.SMTP_FROM, to: employeeEmail,
        subject: `Ticket #${ticket.number} received`,
        text: `Your ${ticket.priority.toLowerCase()} priority ticket #${ticket.number} was created. Sign in to view its details.` });
      state = 'sent';
    } catch { state = 'failed'; }
  }
  const { error } = await admin.from('tickets').update({ email_status: state }).eq('id', ticket.id);
  if (error) console.error('Could not persist email delivery state for ticket', ticket.id);
  return state;
}
