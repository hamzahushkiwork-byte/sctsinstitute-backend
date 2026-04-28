import nodemailer from 'nodemailer';

let transporter = null;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getTransporter() {
  const user = process.env.MAIL_USER?.trim();
  const pass = process.env.MAIL_PASS;
  if (!user || !pass) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user, pass },
    });
  }
  return transporter;
}

function resolveUserDisplayName(user) {
  if (!user || typeof user !== 'object') return 'Unknown';
  const first = user.firstName != null ? String(user.firstName).trim() : '';
  const last = user.lastName != null ? String(user.lastName).trim() : '';
  const combined = [first, last].filter(Boolean).join(' ').trim();
  if (combined) return combined;
  if (user.name != null && String(user.name).trim()) return String(user.name).trim();
  return 'Unknown';
}

/**
 * Notify admin of a new registration via Gmail SMTP.
 * Requires: MAIL_USER, MAIL_PASS (Gmail App Password), ADMIN_EMAIL
 *
 * @param {{ firstName?: string; lastName?: string; name?: string; email: string }} user
 * @returns {Promise<void>}
 * @throws {Error} When SMTP send fails (caller should catch)
 */
export async function sendAdminNotification(user) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const mailUser = process.env.MAIL_USER?.trim();
  const transport = getTransporter();

  if (!adminEmail || !transport || !mailUser) {
    console.warn(
      '[mailer] sendAdminNotification skipped: set MAIL_USER, MAIL_PASS, and ADMIN_EMAIL'
    );
    return;
  }

  const email = user?.email != null ? String(user.email).trim().toLowerCase() : '';
  if (!email) {
    console.warn('[mailer] sendAdminNotification skipped: missing user email');
    return;
  }

  const name = resolveUserDisplayName(user);
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:16px;line-height:1.5;color:#1a202c;">
  <p style="margin:0 0 16px;">A new user has registered on the site.</p>
  <table style="border-collapse:collapse;">
    <tr><td style="padding:4px 12px 4px 0;"><strong>Name</strong></td><td style="padding:4px 0;">${safeName}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;"><strong>Email</strong></td><td style="padding:4px 0;"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
  </table>
</body>
</html>`.trim();

  await transport.sendMail({
    from: `"SCTS Registration" <${mailUser}>`,
    to: adminEmail,
    subject: 'New User Registration',
    text: `New user registration\n\nName: ${name}\nEmail: ${email}\n`,
    html,
  });
}
