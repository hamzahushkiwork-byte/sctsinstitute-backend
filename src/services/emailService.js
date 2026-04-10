import nodemailer from 'nodemailer';
import config from '../config/env.js';

/**
 * Create and return a nodemailer transporter
 * Uses SMTP credentials from environment variables
 */
function createTransporter() {
  return nodemailer.createTransport({
    host: config.emailHost,
    port: parseInt(config.emailPort, 10),
    secure: config.emailSecure === 'true' || config.emailSecure === true,
    auth: {
      user: config.emailUser,
      pass: config.emailPass,
    },
  });
}

/**
 * Send welcome email to newly registered user
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.name - User's full name (firstName + lastName)
 * @returns {Promise<boolean>} Returns true if email sent successfully, false otherwise
 */
export async function sendWelcomeEmail({ to, name }) {
  try {
    // Validate required environment variables
    if (!config.emailHost || !config.emailUser || !config.emailPass) {
      console.error('Email configuration missing. Cannot send welcome email.');
      return false;
    }

    const transporter = createTransporter();

    const siteName = 'SCTS Institute';
    const loginUrl = `${(config.frontendUrl || 'http://localhost:5173').replace(/\/$/, '')}/login`;

    const mailOptions = {
      from: config.emailFrom || config.emailUser,
      to,
      subject: `Welcome to ${siteName} — your account is ready`,
      text: [
        `Hello ${name},`,
        '',
        `Thank you for registering at ${siteName}. Your account has been created successfully.`,
        `You can sign in here: ${loginUrl}`,
        '',
        'This is an automated message. Please do not reply directly to this email.',
      ].join('\n'),
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                      <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Welcome to SCTS Institute</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 40px 30px;">
                        <p style="margin: 0 0 20px 0; color: #2d3748; font-size: 16px; line-height: 1.6;">
                          Hello <strong>${name}</strong>,
                        </p>
                        <p style="margin: 0 0 20px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                          Thank you for registering with SCTS Institute.
                        </p>
                        <p style="margin: 0 0 20px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                          Your account is active. You can sign in with the email and password you used to register.
                        </p>
                        <div style="margin: 30px 0; text-align: center;">
                          <a href="${loginUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                            Sign in
                          </a>
                        </div>
                        <p style="margin: 30px 0 0 0; color: #718096; font-size: 14px; line-height: 1.6;">
                          If you have any questions, feel free to reach out to our support team.
                        </p>
                        <p style="margin: 20px 0 0 0; color: #718096; font-size: 14px; line-height: 1.6;">
                          Best regards,<br>
                          <strong>SCTS Institute</strong>
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 20px 30px; background-color: #f7fafc; border-radius: 0 0 12px 12px; text-align: center;">
                        <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                          This is an automated email. Please do not reply.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send welcome email:', error.message);
    // Don't throw error - return false so registration can still succeed
    return false;
  }
}

/**
 * Send a one-off test message (for GET /test-email).
 * @param {{ to: string }} params
 * @returns {Promise<{ ok: true, messageId?: string } | { ok: false, error: string }>}
 */
export async function sendTestEmail({ to }) {
  if (!config.emailHost || !config.emailUser || !config.emailPass) {
    return { ok: false, error: 'Email configuration missing (EMAIL_HOST, EMAIL_USER, EMAIL_PASS)' };
  }
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: config.emailFrom || config.emailUser,
      to,
      subject: 'Test email — SCTS Institute',
      text: 'If you received this, SMTP is configured correctly.\n\nإذا وصلك هذا الإيميل فكل شي تمام 🎉',
      html: '<p>If you received this, SMTP is configured correctly.</p><p>إذا وصلك هذا الإيميل فكل شي تمام 🎉</p>',
    });
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error('sendTestEmail failed:', err.message);
    return { ok: false, error: err.message || 'sendMail failed' };
  }
}
