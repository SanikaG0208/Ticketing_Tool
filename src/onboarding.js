import nodemailer from 'nodemailer';

export function credentialMessage(employee, loginUrl) {
  return {
    to: employee.email,
    subject: 'Your organization ticketing account',
    text: `Hello ${employee.name},\n\nIT has created your ticketing account.\n\nSign in: ${loginUrl}\nEmail: ${employee.email}\nPassword: ${employee.password}\n\nKeep these credentials private.\n\nOrganization IT team`
  };
}

export async function sendEmployeeCredentials(employee) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM || !process.env.APP_LOGIN_URL) return 'not_configured';
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465, requireTLS: Number(process.env.SMTP_PORT) !== 465,
      connectionTimeout: 10000, socketTimeout: 15000,
      ...(process.env.SMTP_USER ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } } : {})
    });
    await transport.sendMail({ from: process.env.SMTP_FROM, ...credentialMessage(employee, process.env.APP_LOGIN_URL) });
    return 'sent';
  } catch { return 'failed'; }
}
