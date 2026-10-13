import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daysLeft, reminderDue, missingDocs, reminderText, waNumber } from '../src/reminders.js';

const at = s => Date.parse(s); // instants in IST
const NOON_10_OCT = at('2026-10-10T12:00:00+05:30');

test('days left counts calendar days in India time', () => {
  assert.equal(daysLeft('2026-10-10', NOON_10_OCT), 0);
  assert.equal(daysLeft('2026-10-11', NOON_10_OCT), 1);
  assert.equal(daysLeft('2026-10-17', NOON_10_OCT), 7);
  assert.equal(daysLeft('2026-10-08', NOON_10_OCT), -2);
  assert.equal(daysLeft('2026-10-11', at('2026-10-10T23:30:00+05:30')), 1);
});

test('missing docs', () => {
  assert.deepEqual(missingDocs(['Sales invoices', 'ITC summary'], ['ITC summary', 'Other']), ['Sales invoices']);
});

test('no reminder when nothing is missing or deadline is far', () => {
  assert.equal(reminderDue({ due_date: '2026-10-12' }, [], NOON_10_OCT), null);
  assert.equal(reminderDue({ due_date: '2026-10-30' }, ['ITR'], NOON_10_OCT), null);
});

test('first reminder any time within 7 days', () => {
  const r = reminderDue({ due_date: '2026-10-15' }, ['ITR'], NOON_10_OCT);
  assert.deepEqual(r, { days: 5, urgent: false, escalate: false });
});

test('follow-ups only at 3, 1 and overdue', () => {
  const sent = { reminders_sent: 1, last_reminder_at: '2026-10-08 06:30:00' };
  assert.equal(reminderDue({ ...sent, due_date: '2026-10-15' }, ['ITR'], NOON_10_OCT), null); // 5 days
  assert.ok(reminderDue({ ...sent, due_date: '2026-10-13' }, ['ITR'], NOON_10_OCT));         // 3 days
  const r = reminderDue({ ...sent, due_date: '2026-10-11' }, ['ITR'], NOON_10_OCT);          // 1 day
  assert.deepEqual(r, { days: 1, urgent: true, escalate: true });
  assert.ok(reminderDue({ ...sent, due_date: '2026-10-09' }, ['ITR'], NOON_10_OCT));         // overdue
});

test('never twice within 20 hours', () => {
  const recent = { reminders_sent: 1, last_reminder_at: '2026-10-10 03:30:00', due_date: '2026-10-11' }; // 9:00 IST today
  assert.equal(reminderDue(recent, ['ITR'], NOON_10_OCT), null);
});

test('reminder text', () => {
  const t = reminderText('Amit Patel', 'GST return Q3', '2026-10-11', ['Sales invoices', 'ITC summary'], 1);
  assert.match(t, /^Urgent: your GST return Q3 is due tomorrow/);
  assert.match(t, /• Sales invoices\n• ITC summary/);
  assert.match(reminderText('Amit Patel', 'ITR', '2026-10-15', ['Form 16'], 5), /^Hi Amit,/);
});

test('WhatsApp numbers', () => {
  assert.equal(waNumber('98200 11111'), '919820011111');
  assert.equal(waNumber('+91 98200-11111'), '919820011111');
  assert.equal(waNumber('09820011111'), '919820011111');
  assert.equal(waNumber('+1 415 555 0100'), '14155550100');
});
