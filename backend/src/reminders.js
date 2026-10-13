// Deadline reminder rules. Pure functions so the cadence can be tested without WhatsApp.

const DAY = 86400000;
const IST = '+05:30';

// Whole days until the end of the due date in India time; 0 = due today, negative = overdue
export function daysLeft(due_date, now) {
  return Math.ceil((Date.parse(`${due_date}T23:59:59${IST}`) - now) / DAY) - 1;
}

export const missingDocs = (required, receivedTypes) => required.filter(t => !receivedTypes.includes(t));

/**
 * Should the daily job remind this client now?
 * First reminder any time within 7 days of the deadline, then at 3 and 1 days left,
 * then every day once due or overdue. Never twice within 20 hours.
 */
export function reminderDue({ due_date, last_reminder_at, reminders_sent = 0 }, missing, now) {
  if (!missing.length) return null;
  const days = daysLeft(due_date, now);
  if (days > 7) return null;
  if (last_reminder_at && now - Date.parse(last_reminder_at.replace(' ', 'T') + 'Z') < 20 * 3600e3) return null;
  const milestone = days === 3 || days === 1 || days <= 0;
  if (reminders_sent && !milestone) return null;
  return { days, urgent: days <= 1, escalate: days <= 1 && reminders_sent >= 1 };
}

export function dueText(days) {
  if (days < 0) return `was due ${-days} day${days === -1 ? '' : 's'} ago`;
  if (days === 0) return 'is due today';
  if (days === 1) return 'is due tomorrow';
  return `is due in ${days} days`;
}

export function reminderText(name, title, due_date, missing, days) {
  const first = name.split(' ')[0];
  const head = days <= 1 ? `Urgent: your ${title} ${dueText(days)} (${due_date}).` : `Hi ${first}, a reminder from Ledger Hackers: your ${title} ${dueText(days)} (${due_date}).`;
  return `${head}\n\nWe still need:\n${missing.map(m => `• ${m}`).join('\n')}\n\nReply here with the files.`;
}

// Meta wants country code + number, digits only. Ten-digit numbers are assumed Indian.
export function waNumber(phone) {
  const d = (phone || '').replace(/\D/g, '');
  if (d.length === 10) return '91' + d;
  if (d.length === 11 && d.startsWith('0')) return '91' + d.slice(1);
  return d;
}
