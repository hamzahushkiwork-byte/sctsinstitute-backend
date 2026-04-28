import nodemailer from 'nodemailer';

let transporter = null;

function isTruthyEnv(val) {
  if (val === true || val === 1) return true;
  if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1';
  return false;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getTransporter() {
  const user = (process.env.MAIL_USER || process.env.EMAIL_USER || '').trim();
  const pass = process.env.MAIL_PASS || process.env.EMAIL_PASS;
  if (!user || !pass) {
    return null;
  }

  const host = (
    process.env.EMAIL_HOST ||
    process.env.MAIL_SMTP_HOST ||
    'smtp.gmail.com'
  ).trim();
  const defaultPort = host.includes('gmail') ? '587' : '465';
  const port = parseInt(
    process.env.EMAIL_PORT || process.env.MAIL_SMTP_PORT || defaultPort,
    10
  );
  const secure =
    isTruthyEnv(process.env.EMAIL_SECURE) ||
    isTruthyEnv(process.env.MAIL_SMTP_SECURE) ||
    port === 465;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
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
 * Notify admin of a new registration via SMTP (EMAIL_* / Hostinger or MAIL_SMTP_* / Gmail).
 * Requires: ADMIN_EMAIL; auth: MAIL_USER+MAIL_PASS or EMAIL_USER+EMAIL_PASS
 *
 * @param {{ firstName?: string; lastName?: string; name?: string; email: string }} user
 * @returns {Promise<void>}
 * @throws {Error} When SMTP send fails (caller should catch)
 */
export async function sendAdminNotification(user) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const mailUser = (process.env.MAIL_USER || process.env.EMAIL_USER || '').trim();
  const transport = getTransporter();

  if (!adminEmail || !transport || !mailUser) {
    console.warn(
      '[mailer] sendAdminNotification skipped: set ADMIN_EMAIL and SMTP credentials (MAIL_* or EMAIL_*)'
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
