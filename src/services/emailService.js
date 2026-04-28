import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import config from '../config/env.js';

function isTruthyEnv(val) {
  if (val === true || val === 1) return true;
  if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1';
  return false;
}

// ---------------------------------------------------------------------------
// Transport layer — Resend HTTP API (preferred) or SMTP fallback
// ---------------------------------------------------------------------------

const useResend = !!config.resendApiKey;
let resendClient;
if (useResend) {
  resendClient = new Resend(config.resendApiKey);
  console.log('[Email] Using Resend HTTP API (port 443 — no SMTP needed).');
}

function createTransporter() {
  const port = parseInt(config.emailPort, 10) || 587;
  const secure = isTruthyEnv(config.emailSecure) || port === 465;
  const timeoutMs = Math.max(5000, parseInt(config.emailSmtpTimeoutMs, 10) || 60000);
  const familyStr = String(config.emailSmtpFamily || '').trim();
  const family = familyStr === '4' || familyStr === '6' ? parseInt(familyStr, 10) : undefined;

  const transport = {
    host: config.emailHost,
    port,
    secure,
    auth: { user: config.emailUser, pass: config.emailPass },
    connectionTimeout: timeoutMs,
    greetingTimeout: Math.min(30000, timeoutMs),
    socketTimeout: timeoutMs,
  };
  if (family === 4 || family === 6) transport.family = family;
  return nodemailer.createTransport(transport);
}

function logEmailFailure(context, err) {
  const e = err && typeof err === 'object' ? err : {};
  const bits = [e.message || String(err)];
  if (e.code) bits.push(`code=${e.code}`);
  if (e.command) bits.push(`command=${e.command}`);
  if (e.responseCode) bits.push(`smtpCode=${e.responseCode}`);
  if (e.response) bits.push(`response=${String(e.response).slice(0, 300)}`);
  if (e.statusCode) bits.push(`httpStatus=${e.statusCode}`);
  console.error(`[Email] ${context}:`, bits.join(' | '));
  const msg = String(e.message || '');
  if (e.code === 'ETIMEDOUT' || e.code === 'ESOCKET' || /timeout/i.test(msg)) {
    console.error(
      '[Email] SMTP timed out. Set RESEND_API_KEY to bypass SMTP and send via HTTPS instead.'
    );
  }
}

/**
 * Unified mail delivery — uses Resend HTTP when available, SMTP otherwise.
 * @param {{ from?: string, to: string, subject: string, text?: string, html?: string }} opts
 * @returns {Promise<{ messageId?: string }>}
 */
async function deliverMail({ from, to, subject, text, html }) {
  const sender = from || config.emailFrom || config.emailUser;

  if (useResend) {
    const payload = { from: sender, to: [to], subject };
    if (html && html.trim()) payload.html = html;
    if (text && text.trim()) payload.text = text;
    const { data, error } = await resendClient.emails.send(payload);
    if (error) throw new Error(error.message || JSON.stringify(error));
    return { messageId: data?.id };
  }

  if (!config.emailHost || !config.emailUser || !config.emailPass) {
    throw new Error('Email not configured (set RESEND_API_KEY or EMAIL_HOST+USER+PASS)');
  }
  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: sender,
    to,
    subject,
    text: text?.trim() ? text : undefined,
    html: html?.trim() ? html : undefined,
  });
  return { messageId: info.messageId };
}

/** Quick check whether any email provider is configured. */
function isEmailConfigured() {
  if (useResend) return true;
  return !!(config.emailHost && config.emailUser && config.emailPass);
}

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const ORG_NAME_EN = 'Saudi Canadian Training & Simulation Center';
const ORG_NAME_AR = 'المركز السعودي الكندي للتدريب والمحاكاة';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const DETAIL_TBD_EN = 'To be confirmed';
const DETAIL_TBD_AR = 'سيتم التأكيد لاحقًا';

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
 * Confirmed booking email (bilingual) — matches center template; uses registration date + course time/location.
 */
function buildPaidBookingConfirmationEmail({
  name,
  courseTitle,
  courseSlug,
  sessionDateKey,
  courseSessionTime,
  courseLocation,
  notes,
}) {
  const safeName = escapeHtml(name || 'Participant');
  const safeTitle = escapeHtml(courseTitle || 'Course');
  const baseUrl = (config.frontendUrl || 'http://localhost:5173').replace(/\/$/, '');
  const coursePath = courseSlug ? `/courses/${encodeURI(courseSlug)}` : '/courses';
  const courseUrl = `${baseUrl}${coursePath}`;

  const { en: sessionEn, ar: sessionAr } = formatSessionDateForEmail(sessionDateKey);
  const dateEn = sessionEn || DETAIL_TBD_EN;
  const dateAr = sessionAr || DETAIL_TBD_AR;
  const timeEn = String(courseSessionTime || '').trim() || DETAIL_TBD_EN;
  const timeAr = String(courseSessionTime || '').trim() || DETAIL_TBD_AR;
  const locEn = String(courseLocation || '').trim() || DETAIL_TBD_EN;
  const locAr = String(courseLocation || '').trim() || DETAIL_TBD_AR;

  const safeTimeEn = escapeHtml(timeEn);
  const safeTimeAr = escapeHtml(timeAr);
  const safeLocEn = escapeHtml(locEn);
  const safeLocAr = escapeHtml(locAr);
  const safeDateEn = escapeHtml(dateEn);
  const safeDateAr = escapeHtml(dateAr);

  const rawNotes = notes && String(notes).trim() ? String(notes).trim() : '';
  const safeNotesHtml = rawNotes
    ? `<p style="margin:16px 0 0 0;padding:14px;background:#f7fafc;border-radius:8px;color:#2d3748;font-size:14px;line-height:1.6;"><strong>Message from our team:</strong><br>${escapeHtml(rawNotes).replace(/\n/g, '<br>')}</p>`
    : '';
  const notesTextEn = rawNotes ? `\nMessage from our team:\n${rawNotes}\n` : '';
  const notesTextAr = rawNotes ? `\nملاحظة من الفريق:\n${rawNotes}\n` : '';

  const text = [
    `Dear ${name || 'Participant'},`,
    '',
    `Your booking for the course "${courseTitle}" at the ${ORG_NAME_EN} is confirmed.`,
    '',
    'Please find below the details:',
    `Course: ${courseTitle}`,
    `Date: ${dateEn}`,
    `Time: ${timeEn}`,
    `Location: ${locEn}`,
    notesTextEn,
    'If you wish to reschedule or cancel your booking, please contact us at any time.',
    '',
    'We look forward to having you with us.',
    '',
    'Best regards,',
    ORG_NAME_EN,
    '',
    '———',
    '',
    'عزيزي/عزيزتي،',
    '',
    `تم تأكيد حجزك لدورة «${courseTitle}» في ${ORG_NAME_AR}.`,
    '',
    'تفاصيل الدورة:',
    `الدورة: ${courseTitle}`,
    `التاريخ: ${dateAr}`,
    `الوقت: ${timeAr}`,
    `الموقع: ${locAr}`,
    notesTextAr,
    'في حال رغبتك في إعادة الجدولة أو الإلغاء، يرجى التواصل معنا في أي وقت.',
    '',
    'نتطلع لحضورك معنا.',
    '',
    'تحياتنا،',
    ORG_NAME_AR,
    '',
    `View course: ${courseUrl}`,
  ].join('\n');

  const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking confirmed</title>
        </head>
        <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#f5f7fa;">
          <table role="presentation" style="width:100%;border-collapse:collapse;">
            <tr>
              <td align="center" style="padding:40px 20px;">
                <table role="presentation" style="max-width:560px;width:100%;background:#fff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,.08);">
                  <tr>
                    <td style="padding:32px;">
                      <p style="margin:0 0 12px;color:#1a202c;font-size:16px;line-height:1.6;">Dear <strong>${safeName}</strong>,</p>
                      <p style="margin:0 0 16px;color:#2d3748;font-size:16px;line-height:1.65;">Your booking for the course <strong>${safeTitle}</strong> at the <strong>${ORG_NAME_EN}</strong> is confirmed.</p>
                      <p style="margin:0 0 10px;color:#1a202c;font-size:15px;font-weight:600;">Please find below the details:</p>
                      <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#2d3748;">
                        <tr><td style="padding:4px 0;"><strong>Course:</strong></td><td style="padding:4px 0;">${safeTitle}</td></tr>
                        <tr><td style="padding:4px 0;"><strong>Date:</strong></td><td style="padding:4px 0;">${safeDateEn}</td></tr>
                        <tr><td style="padding:4px 0;"><strong>Time:</strong></td><td style="padding:4px 0;">${safeTimeEn}</td></tr>
                        <tr><td style="padding:4px 0;vertical-align:top;"><strong>Location:</strong></td><td style="padding:4px 0;">${safeLocEn}</td></tr>
                      </table>
                      ${safeNotesHtml}
                      <p style="margin:16px 0 0 0;color:#2d3748;font-size:15px;line-height:1.65;">If you wish to reschedule or cancel your booking, please contact us at any time.</p>
                      <p style="margin:12px 0 0 0;color:#2d3748;font-size:15px;line-height:1.65;">We look forward to having you with us.</p>
                      <p style="margin:20px 0 0 0;color:#2d3748;font-size:16px;line-height:1.6;">Best regards,<br><strong>${ORG_NAME_EN}</strong></p>
                      <p style="margin:16px 0 0 0;font-size:14px;"><a href="${courseUrl}" style="color:#2b6cb0;">View course on our website</a></p>
                      <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;">
                      <div dir="rtl" style="text-align:right;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,'Tahoma',sans-serif;">
                        <p style="margin:0 0 12px;color:#1a202c;font-size:16px;line-height:1.75;">عزيزي/عزيزتي،</p>
                        <p style="margin:0 0 16px;color:#2d3748;font-size:16px;line-height:1.75;">تم تأكيد حجزك لدورة <strong>${safeTitle}</strong> في <strong>${ORG_NAME_AR}</strong>.</p>
                        <p style="margin:0 0 10px;color:#1a202c;font-size:15px;font-weight:600;">تفاصيل الدورة:</p>
                        <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 16px 0;font-size:15px;line-height:1.75;color:#2d3748;">
                          <tr><td style="padding:4px 0;"><strong>الدورة:</strong></td><td style="padding:4px 0;">${safeTitle}</td></tr>
                          <tr><td style="padding:4px 0;"><strong>التاريخ:</strong></td><td style="padding:4px 0;">${safeDateAr}</td></tr>
                          <tr><td style="padding:4px 0;"><strong>الوقت:</strong></td><td style="padding:4px 0;">${safeTimeAr}</td></tr>
                          <tr><td style="padding:4px 0;vertical-align:top;"><strong>الموقع:</strong></td><td style="padding:4px 0;">${safeLocAr}</td></tr>
                        </table>
                        ${rawNotes ? `<p style="margin:16px 0 0 0;padding:14px;background:#f7fafc;border-radius:8px;color:#2d3748;font-size:14px;line-height:1.75;text-align:right;"><strong>ملاحظة من الفريق:</strong><br>${escapeHtml(rawNotes).replace(/\n/g, '<br>')}</p>` : ''}
                        <p style="margin:16px 0 0 0;color:#2d3748;font-size:15px;line-height:1.75;">في حال رغبتك في إعادة الجدولة أو الإلغاء، يرجى التواصل معنا في أي وقت.</p>
                        <p style="margin:12px 0 0 0;color:#2d3748;font-size:15px;line-height:1.75;">نتطلع لحضورك معنا.</p>
                        <p style="margin:20px 0 0 0;color:#2d3748;font-size:16px;line-height:1.75;">تحياتنا،<br><strong>${ORG_NAME_AR}</strong></p>
                        <p style="margin:16px 0 0 0;font-size:14px;"><a href="${courseUrl}" style="color:#2b6cb0;">عرض الدورة على الموقع</a></p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 32px;background:#f7fafc;border-radius:0 0 12px 12px;text-align:center;">
                      <p style="margin:0;color:#a0aec0;font-size:12px;">Automated message — course booking</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

  return { text, html, subject: `Course booking confirmed — ${courseTitle}` };
}

// ---------------------------------------------------------------------------
// Public email functions
// ---------------------------------------------------------------------------

export async function sendWelcomeEmail({ to, name }) {
  try {
    if (!isEmailConfigured()) {
      console.error('Email configuration missing. Cannot send welcome email.');
      return false;
    }

    const loginUrl = `${(config.frontendUrl || 'http://localhost:5173').replace(/\/$/, '')}/login`;
    const safeName = escapeHtml(name);

    const text = [
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

    const html = `
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
    `;

    const info = await deliverMail({
      to,
      subject: `Thank you for registering — ${ORG_NAME_EN}`,
      text,
      html,
    });
    console.log('Welcome email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    logEmailFailure('welcome email', error);
    return false;
  }
}

export async function sendPasswordResetOtpEmail({ to, otp, name = '' }) {
  try {
    if (!isEmailConfigured()) {
      console.error('Email configuration missing. Cannot send password reset email.');
      return false;
    }
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

    await deliverMail({
      to,
      subject: `Your password reset code — ${ORG_NAME_EN}`,
      text,
      html,
    });
    return true;
  } catch (err) {
    logEmailFailure('password reset email', err);
    return false;
  }
}

export async function sendCourseRegistrationStatusEmail({
  to,
  name = '',
  courseTitle,
  courseSlug = '',
  status,
  notes = '',
  sessionDateKey = '',
  courseSessionTime = '',
  courseLocation = '',
}) {
  try {
    if (!isEmailConfigured()) {
      console.error('Email configuration missing. Cannot send course registration email.');
      return false;
    }

    if (status === 'paid') {
      const { text, html, subject } = buildPaidBookingConfirmationEmail({
        name,
        courseTitle,
        courseSlug,
        sessionDateKey,
        courseSessionTime,
        courseLocation,
        notes,
      });
      await deliverMail({ to, subject, text, html });
      return true;
    }

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

    await deliverMail({
      to,
      subject: `Course registration: ${copy.enLabel} — ${courseTitle}`,
      text,
      html,
    });
    return true;
  } catch (err) {
    logEmailFailure('course registration email', err);
    return false;
  }
}

function resolveSignupUserDisplayName(user) {
  if (!user || typeof user !== 'object') return 'Unknown';
  const first = user.firstName != null ? String(user.firstName).trim() : '';
  const last = user.lastName != null ? String(user.lastName).trim() : '';
  const combined = [first, last].filter(Boolean).join(' ').trim();
  if (combined) return combined;
  if (user.name != null && String(user.name).trim()) return String(user.name).trim();
  return 'Unknown';
}

/**
 * Notify admin of a new user signup. Uses the same transport as welcome mail
 * (Resend HTTPS when RESEND_API_KEY is set — recommended on Railway).
 * Requires ADMIN_EMAIL. Set RESEND_API_KEY + EMAIL_FROM on production.
 */
export async function sendAdminNotification(user) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  if (!adminEmail) {
    console.warn('[Email] sendAdminNotification skipped: ADMIN_EMAIL is not set');
    return;
  }
  if (!isEmailConfigured()) {
    console.warn('[Email] sendAdminNotification skipped: no email provider (RESEND_API_KEY or SMTP)');
    return;
  }

  const email = user?.email != null ? String(user.email).trim().toLowerCase() : '';
  if (!email) {
    console.warn('[Email] sendAdminNotification skipped: user has no email');
    return;
  }

  const name = resolveSignupUserDisplayName(user);
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

  const text = `New user registration\n\nName: ${name}\nEmail: ${email}\n`;

  try {
    await deliverMail({
      to: adminEmail,
      subject: 'New User Registration',
      text,
      html,
    });
  } catch (err) {
    logEmailFailure('admin signup notification', err);
    throw err;
  }
}

export async function sendSimpleEmail({ to, subject, text = '', html = '' }) {
  try {
    if (!isEmailConfigured()) {
      console.error('Email configuration missing. Cannot send email.');
      return false;
    }
    if (!to || !subject) return false;
    await deliverMail({
      to,
      subject: String(subject).slice(0, 998),
      text,
      html,
    });
    return true;
  } catch (err) {
    logEmailFailure(`sendSimpleEmail (${to})`, err);
    return false;
  }
}

export async function sendTestEmail({ to }) {
  if (!isEmailConfigured()) {
    return { ok: false, error: 'Email not configured (set RESEND_API_KEY or EMAIL_HOST+USER+PASS)' };
  }
  try {
    const info = await deliverMail({
      to,
      subject: `Test email — ${ORG_NAME_EN}`,
      text: 'If you received this, email is configured correctly.\n\nإذا وصلك هذا الإيميل فكل شي تمام 🎉',
      html: '<p>If you received this, email is configured correctly.</p><p>إذا وصلك هذا الإيميل فكل شي تمام 🎉</p>',
    });
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    logEmailFailure('sendTestEmail', err);
    return { ok: false, error: err.message || 'Send failed' };
  }
}
