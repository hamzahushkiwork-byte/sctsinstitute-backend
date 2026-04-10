import nodemailer from 'nodemailer';
import config from '../config/env.js';

function isTruthyEnv(val) {
  if (val === true || val === 1) return true;
  if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1';
  return false;
}

/**
 * Create and return a nodemailer transporter
 * Uses SMTP credentials from environment variables
 */
function createTransporter() {
  const port = parseInt(config.emailPort, 10) || 587;
  const secure = isTruthyEnv(config.emailSecure) || port === 465;
  return nodemailer.createTransport({
    host: config.emailHost,
    port,
    secure,
    auth: {
      user: config.emailUser,
      pass: config.emailPass,
    },
  });
}

const ORG_NAME_EN = 'Saudi Canadian Training & Simulation Center';
const ORG_NAME_AR = 'المركز السعودي الكندي للتدريب والمحاكاة';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatSessionDateForEmail(sessionDateKey) {
  const key = sessionDateKey == null ? '' : String(sessionDateKey).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return { en: '', ar: '' };
  try {
    const d = new Date(`${key}T12:00:00Z`);
    if (Number.isNaN(d.getTime())) return { en: key, ar: key };
    const en = d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    let ar;
    try {
      ar = d.toLocaleDateString('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      ar = en;
    }
    return { en, ar };
  } catch {
    return { en: key, ar: key };
  }
}

/** @param {'pending'|'paid'|'rejected'} status */
function courseRegistrationStatusCopy(status) {
  const map = {
    pending: {
      enLabel: 'Pending review',
      enBody:
        'Your course registration is pending review. We will notify you again if the status changes.',
      arLabel: 'قيد المراجعة',
      arBody: 'تسجيلك في الدورة قيد المراجعة. سنُعلمك مجددًا عند تغيير الحالة.',
    },
    paid: {
      enLabel: 'Confirmed',
      enBody: 'Your course registration has been confirmed. Thank you—we look forward to seeing you.',
      arLabel: 'مؤكّد',
      arBody: 'تم تأكيد تسجيلك في الدورة. شكرًا لك، ونتطلع لرؤيتك.',
    },
    rejected: {
      enLabel: 'Not approved',
      enBody:
        'Your course registration could not be approved at this time. If you have questions, please contact us via our website.',
      arLabel: 'غير مقبول',
      arBody:
        'لم يتم قبول تسجيلك في هذه الدورة حاليًا. إذا كان لديك أي استفسار، يرجى التواصل معنا عبر الموقع.',
    },
  };
  return map[status] || map.pending;
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

    const loginUrl = `${(config.frontendUrl || 'http://localhost:5173').replace(/\/$/, '')}/login`;
    const safeName = escapeHtml(name);

    const textEn = [
      `Dear ${name},`,
      '',
      `Thank you for registering with the ${ORG_NAME_EN}. We're happy to have you as part of our community.`,
      '',
      'If you need any assistance, feel free to reach out to us anytime.',
      '',
      'Best regards,',
      ORG_NAME_EN,
      '',
      '———',
      '',
      'عزيزي/عزيزتي،',
      '',
      `شكرًا لتسجيلك في ${ORG_NAME_AR}. يسعدنا انضمامك إلى عائلتنا.`,
      '',
      'في حال احتجت أي مساعدة، لا تتردد في التواصل معنا في أي وقت.',
      '',
      'تحياتنا،',
      ORG_NAME_AR,
      '',
      `Sign in: ${loginUrl}`,
    ].join('\n');

    const mailOptions = {
      from: config.emailFrom || config.emailUser,
      to,
      subject: `Thank you for registering — ${ORG_NAME_EN}`,
      text: textEn,
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Thank you for registering</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.08);">
                    <tr>
                      <td style="padding: 36px 32px 24px 32px;">
                        <p style="margin: 0 0 16px 0; color: #1a202c; font-size: 16px; line-height: 1.65;">
                          Dear <strong>${safeName}</strong>,
                        </p>
                        <p style="margin: 0 0 16px 0; color: #2d3748; font-size: 16px; line-height: 1.65;">
                          Thank you for registering with the ${ORG_NAME_EN}. We're happy to have you as part of our community.
                        </p>
                        <p style="margin: 0 0 16px 0; color: #2d3748; font-size: 16px; line-height: 1.65;">
                          If you need any assistance, feel free to reach out to us anytime.
                        </p>
                        <p style="margin: 0 0 28px 0; color: #2d3748; font-size: 16px; line-height: 1.65;">
                          Best regards,<br>
                          <strong>${ORG_NAME_EN}</strong>
                        </p>
                        <p style="margin: 0 0 8px 0; color: #718096; font-size: 13px; line-height: 1.5;">
                          <a href="${loginUrl}" style="color: #2b6cb0;">Sign in to your account</a>
                        </p>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
                        <div dir="rtl" style="text-align: right;">
                          <p style="margin: 0 0 16px 0; color: #1a202c; font-size: 16px; line-height: 1.75; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Arabic UI Text', 'Tahoma', sans-serif;">
                            عزيزي/عزيزتي،
                          </p>
                          <p style="margin: 0 0 16px 0; color: #2d3748; font-size: 16px; line-height: 1.75; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Arabic UI Text', 'Tahoma', sans-serif;">
                            شكرًا لتسجيلك في ${ORG_NAME_AR}. يسعدنا انضمامك إلى عائلتنا.
                          </p>
                          <p style="margin: 0 0 16px 0; color: #2d3748; font-size: 16px; line-height: 1.75; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Arabic UI Text', 'Tahoma', sans-serif;">
                            في حال احتجت أي مساعدة، لا تتردد في التواصل معنا في أي وقت.
                          </p>
                          <p style="margin: 0; color: #2d3748; font-size: 16px; line-height: 1.75; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Arabic UI Text', 'Tahoma', sans-serif;">
                            تحياتنا،<br>
                            <strong>${ORG_NAME_AR}</strong>
                          </p>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 20px 32px; background-color: #f7fafc; border-radius: 0 0 12px 12px; text-align: center;">
                        <p style="margin: 0; color: #a0aec0; font-size: 12px; line-height: 1.5;">
                          This is an automated message. Please use the contact options on our website if you need help.
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
 * Send 6-digit OTP for password reset (plain + HTML).
 * @param {{ to: string, otp: string, name?: string }} params
 * @returns {Promise<boolean>}
 */
export async function sendPasswordResetOtpEmail({ to, otp, name = '' }) {
  try {
    if (!config.emailHost || !config.emailUser || !config.emailPass) {
      console.error('Email configuration missing. Cannot send password reset email.');
      return false;
    }
    const transporter = createTransporter();
    const safeName = escapeHtml(name || 'Participant');
    const safeOtp = escapeHtml(otp);
    const loginUrl = `${(config.frontendUrl || 'http://localhost:5173').replace(/\/$/, '')}/login`;

    const text = [
      `Dear ${name || 'Participant'},`,
      '',
      'We received a request to reset your password.',
      '',
      `Your verification code is: ${otp}`,
      '',
      'This code expires in 15 minutes. If you did not request a reset, you can ignore this email.',
      '',
      `Sign in: ${loginUrl}`,
      '',
      'Best regards,',
      ORG_NAME_EN,
      '',
      '———',
      '',
      'عزيزي/عزيزتي،',
      '',
      'تلقينا طلبًا لإعادة تعيين كلمة المرور.',
      '',
      `رمز التحقق الخاص بك: ${otp}`,
      '',
      'ينتهي صلاحية هذا الرمز خلال 15 دقيقة. إذا لم تطلب إعادة التعيين، يمكنك تجاهل هذه الرسالة.',
      '',
      'تحياتنا،',
      ORG_NAME_AR,
    ].join('\n');

    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password reset code</title>
        </head>
        <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#f5f7fa;">
          <table role="presentation" style="width:100%;border-collapse:collapse;">
            <tr>
              <td align="center" style="padding:40px 20px;">
                <table role="presentation" style="max-width:560px;width:100%;background:#fff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,.08);">
                  <tr>
                    <td style="padding:32px;">
                      <p style="margin:0 0 12px;color:#1a202c;font-size:16px;line-height:1.6;">Dear <strong>${safeName}</strong>,</p>
                      <p style="margin:0 0 20px;color:#2d3748;font-size:16px;line-height:1.6;">We received a request to reset your password for <strong>${ORG_NAME_EN}</strong>.</p>
                      <p style="margin:0 0 8px;color:#2d3748;font-size:14px;">Your verification code:</p>
                      <p style="margin:0 0 24px;font-size:32px;letter-spacing:8px;font-weight:700;color:#2b6cb0;text-align:center;">${safeOtp}</p>
                      <p style="margin:0 0 12px;color:#718096;font-size:14px;line-height:1.6;">This code expires in <strong>15 minutes</strong>. If you did not request this, you can ignore this email.</p>
                      <p style="margin:0 0 24px;font-size:14px;"><a href="${loginUrl}" style="color:#2b6cb0;">Sign in</a></p>
                      <p style="margin:0;color:#2d3748;font-size:16px;line-height:1.6;">Best regards,<br><strong>${ORG_NAME_EN}</strong></p>
                      <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;">
                      <div dir="rtl" style="text-align:right;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,'Tahoma',sans-serif;">
                        <p style="margin:0 0 12px;color:#1a202c;font-size:16px;line-height:1.75;">عزيزي/عزيزتي،</p>
                        <p style="margin:0 0 16px;color:#2d3748;font-size:16px;line-height:1.75;">تلقينا طلبًا لإعادة تعيين كلمة المرور.</p>
                        <p style="margin:0 0 8px;color:#2d3748;font-size:14px;">رمز التحقق الخاص بك:</p>
                        <p style="margin:0 0 20px;font-size:28px;letter-spacing:6px;font-weight:700;color:#2b6cb0;text-align:center;direction:ltr;">${safeOtp}</p>
                        <p style="margin:0 0 16px;color:#2d3748;font-size:16px;line-height:1.75;">ينتهي صلاحية هذا الرمز خلال <strong>15 دقيقة</strong>. إذا لم تطلب إعادة التعيين، يمكنك تجاهل هذه الرسالة.</p>
                        <p style="margin:0;color:#2d3748;font-size:16px;line-height:1.75;">تحياتنا،<br><strong>${ORG_NAME_AR}</strong></p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 32px;background:#f7fafc;border-radius:0 0 12px 12px;text-align:center;">
                      <p style="margin:0;color:#a0aec0;font-size:12px;">This is an automated message related to account security.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: config.emailFrom || config.emailUser,
      to,
      subject: `Your password reset code — ${ORG_NAME_EN}`,
      text,
      html,
    });
    return true;
  } catch (err) {
    console.error('Failed to send password reset email:', err.message);
    return false;
  }
}

/**
 * Notify user when admin updates course registration status.
 * @param {{ to: string, name?: string, courseTitle: string, courseSlug?: string, status: string, notes?: string, sessionDateKey?: string }} params
 * @returns {Promise<boolean>}
 */
export async function sendCourseRegistrationStatusEmail({
  to,
  name = '',
  courseTitle,
  courseSlug = '',
  status,
  notes = '',
  sessionDateKey = '',
}) {
  try {
    if (!config.emailHost || !config.emailUser || !config.emailPass) {
      console.error('Email configuration missing. Cannot send course registration email.');
      return false;
    }
    const transporter = createTransporter();
    const copy = courseRegistrationStatusCopy(status);
    const safeName = escapeHtml(name || 'Participant');
    const safeTitle = escapeHtml(courseTitle || 'Course');
    const safeNotes = escapeHtml(notes || '');
    const baseUrl = (config.frontendUrl || 'http://localhost:5173').replace(/\/$/, '');
    const coursePath = courseSlug ? `/courses/${encodeURI(courseSlug)}` : '/courses';
    const courseUrl = `${baseUrl}${coursePath}`;
    const { en: sessionEn, ar: sessionAr } = formatSessionDateForEmail(sessionDateKey);

    const sessionLineEn = sessionEn ? `\nPreferred session date: ${sessionEn}\n` : '\n';
    const sessionLineAr = sessionAr ? `\nتاريخ الجلسة المفضّل: ${sessionAr}\n` : '\n';

    const notesLineEn =
      notes && String(notes).trim()
        ? `\nMessage from our team:\n${String(notes).trim()}\n`
        : '\n';
    const notesLineAr =
      notes && String(notes).trim()
        ? `\nملاحظة من الفريق:\n${String(notes).trim()}\n`
        : '\n';

    const text = [
      `Dear ${name || 'Participant'},`,
      '',
      `Your registration status for "${courseTitle}" has been updated.`,
      '',
      `Current status: ${copy.enLabel}`,
      copy.enBody,
      sessionLineEn,
      notesLineEn,
      `View courses: ${courseUrl}`,
      '',
      'Best regards,',
      ORG_NAME_EN,
      '',
      '———',
      '',
      'عزيزي/عزيزتي،',
      '',
      `تم تحديث حالة تسجيلك في الدورة «${courseTitle}».`,
      '',
      `الحالة الحالية: ${copy.arLabel}`,
      copy.arBody,
      sessionLineAr,
      notesLineAr,
      `رابط الدورات: ${courseUrl}`,
      '',
      'تحياتنا،',
      ORG_NAME_AR,
    ].join('\n');

    const notesHtml =
      notes && String(notes).trim()
        ? `<p style="margin:16px 0 0 0;padding:14px;background:#f7fafc;border-radius:8px;color:#2d3748;font-size:14px;line-height:1.6;"><strong>Message from our team:</strong><br>${safeNotes.replace(/\n/g, '<br>')}</p>`
        : '';

    const sessionHtmlEn =
      sessionEn
        ? `<p style="margin:12px 0 0 0;color:#4a5568;font-size:14px;"><strong>Preferred session date:</strong> ${escapeHtml(sessionEn)}</p>`
        : '';
    const sessionHtmlAr =
      sessionAr
        ? `<p style="margin:12px 0 0 0;color:#4a5568;font-size:14px;" dir="rtl"><strong>تاريخ الجلسة:</strong> ${escapeHtml(sessionAr)}</p>`
        : '';

    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Course registration update</title>
        </head>
        <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#f5f7fa;">
          <table role="presentation" style="width:100%;border-collapse:collapse;">
            <tr>
              <td align="center" style="padding:40px 20px;">
                <table role="presentation" style="max-width:560px;width:100%;background:#fff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,.08);">
                  <tr>
                    <td style="padding:32px;">
                      <p style="margin:0 0 12px;color:#1a202c;font-size:16px;line-height:1.6;">Dear <strong>${safeName}</strong>,</p>
                      <p style="margin:0 0 16px;color:#2d3748;font-size:16px;line-height:1.6;">Your registration status for <strong>${safeTitle}</strong> has been updated.</p>
                      <p style="margin:0 0 8px;color:#2d3748;font-size:14px;"><strong>Status:</strong> <span style="color:#2b6cb0;">${escapeHtml(copy.enLabel)}</span></p>
                      <p style="margin:0 0 8px;color:#4a5568;font-size:15px;line-height:1.65;">${escapeHtml(copy.enBody)}</p>
                      ${sessionHtmlEn}
                      ${notesHtml}
                      <p style="margin:20px 0 0 0;font-size:14px;"><a href="${courseUrl}" style="color:#2b6cb0;">View course on our website</a></p>
                      <p style="margin:24px 0 0 0;color:#2d3748;font-size:16px;line-height:1.6;">Best regards,<br><strong>${ORG_NAME_EN}</strong></p>
                      <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;">
                      <div dir="rtl" style="text-align:right;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,'Tahoma',sans-serif;">
                        <p style="margin:0 0 12px;color:#1a202c;font-size:16px;line-height:1.75;">عزيزي/عزيزتي،</p>
                        <p style="margin:0 0 16px;color:#2d3748;font-size:16px;line-height:1.75;">تم تحديث حالة تسجيلك في الدورة <strong>${safeTitle}</strong>.</p>
                        <p style="margin:0 0 8px;color:#2d3748;font-size:14px;"><strong>الحالة:</strong> <span style="color:#2b6cb0;">${escapeHtml(copy.arLabel)}</span></p>
                        <p style="margin:0 0 8px;color:#4a5568;font-size:15px;line-height:1.75;">${escapeHtml(copy.arBody)}</p>
                        ${sessionHtmlAr}
                        <p style="margin:20px 0 0 0;font-size:14px;"><a href="${courseUrl}" style="color:#2b6cb0;">عرض الدورة على الموقع</a></p>
                        <p style="margin:24px 0 0 0;color:#2d3748;font-size:16px;line-height:1.75;">تحياتنا،<br><strong>${ORG_NAME_AR}</strong></p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 32px;background:#f7fafc;border-radius:0 0 12px 12px;text-align:center;">
                      <p style="margin:0;color:#a0aec0;font-size:12px;">Automated message — course registration</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: config.emailFrom || config.emailUser,
      to,
      subject: `Course registration: ${copy.enLabel} — ${courseTitle}`,
      text,
      html,
    });
    return true;
  } catch (err) {
    console.error('Failed to send course registration status email:', err.message);
    return false;
  }
}

/**
 * Single-recipient email (admin broadcast sends one per user).
 * @param {{ to: string, subject: string, text?: string, html?: string }} params
 * @returns {Promise<boolean>}
 */
export async function sendSimpleEmail({ to, subject, text = '', html = '' }) {
  try {
    if (!config.emailHost || !config.emailUser || !config.emailPass) {
      console.error('Email configuration missing. Cannot send email.');
      return false;
    }
    if (!to || !subject) return false;
    const transporter = createTransporter();
    await transporter.sendMail({
      from: config.emailFrom || config.emailUser,
      to,
      subject: String(subject).slice(0, 998),
      text: text?.trim() ? text : undefined,
      html: html?.trim() ? html : undefined,
    });
    return true;
  } catch (err) {
    console.error('sendSimpleEmail failed:', to, err.message);
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
      subject: `Test email — ${ORG_NAME_EN}`,
      text: 'If you received this, SMTP is configured correctly.\n\nإذا وصلك هذا الإيميل فكل شي تمام 🎉',
      html: '<p>If you received this, SMTP is configured correctly.</p><p>إذا وصلك هذا الإيميل فكل شي تمام 🎉</p>',
    });
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error('sendTestEmail failed:', err.message);
    return { ok: false, error: err.message || 'sendMail failed' };
  }
}
