import User from '../models/User.model.js';
import BroadcastEmailLog from '../models/BroadcastEmailLog.model.js';
import { sendSimpleEmail } from './emailService.js';

function applyPlaceholders(template, user) {
  if (template == null) return '';
  const str = String(template);
  const fn = user?.firstName || '';
  const ln = user?.lastName || '';
  const em = user?.email || '';
  return str
    .replace(/\{\{firstName\}\}/gi, fn)
    .replace(/\{\{lastName\}\}/gi, ln)
    .replace(/\{\{email\}\}/gi, em);
}

export async function getBroadcastEmailLogs(limit = 200) {
  return BroadcastEmailLog.find().sort({ createdAt: -1 }).limit(limit).lean();
}

/**
 * Send the same message (with optional {{firstName}} etc.) to all matching users; append history row.
 */
export async function runBroadcastEmail(
  { subject, text = '', html = '', includeAdmins = false },
  reqUser
) {
  const subj = subject != null ? String(subject).trim() : '';
  if (!subj) {
    throw new Error('Subject is required');
  }
  const textBody = text != null ? String(text) : '';
  const htmlBody = html != null ? String(html) : '';
  if (!textBody.trim() && !htmlBody.trim()) {
    throw new Error('Message text or HTML is required');
  }

  const query = includeAdmins ? {} : { role: { $in: ['user'] } };
  const users = await User.find(query).select('email firstName lastName role').lean();
  const recipients = users.filter((u) => u.email && String(u.email).includes('@'));

  let successCount = 0;
  let failCount = 0;

  for (const user of recipients) {
    const personalizedSubject = applyPlaceholders(subj, user);
    const personalizedText = applyPlaceholders(textBody, user);
    const personalizedHtml = htmlBody.trim() ? applyPlaceholders(htmlBody, user) : '';

    const ok = await sendSimpleEmail({
      to: String(user.email).toLowerCase().trim(),
      subject: personalizedSubject,
      text: personalizedText.trim() ? personalizedText : undefined,
      html: personalizedHtml.trim() ? personalizedHtml : undefined,
    });
    if (ok) successCount += 1;
    else failCount += 1;
  }

  const textPreview = textBody.trim().slice(0, 500);

  const log = await BroadcastEmailLog.create({
    subject: subj,
    textPreview,
    includeAdmins: !!includeAdmins,
    recipientCount: recipients.length,
    successCount,
    failCount,
    sentByUserId: reqUser?.userId || null,
    sentByEmail: reqUser?.email ? String(reqUser.email) : '',
  });

  return {
    log: log.toObject({ versionKey: false }),
    recipientCount: recipients.length,
    successCount,
    failCount,
  };
}
