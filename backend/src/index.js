import PostalMime from 'postal-mime';
import { classify, ruleKey, AUTO_FILE, DOC_TYPES } from './classify.js';
import { reminderDue, reminderText, missingDocs, daysLeft, dueText, waNumber } from './reminders.js';

const MAX_BYTES = 20 * 1024 * 1024; // KV values cap at 25 MB
const ALLOWED = /\.(pdf|xlsx?|csv|jpe?g|png|heic|zip|json|xml|txt)$/i;
// Overridable so the WhatsApp calls can be tested against a local mock
const graph = env => env.WHATSAPP_API_BASE || 'https://graph.facebook.com/v21.0';
const waReady = env => !!(env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_ID);

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
const fail = (status, error) => json({ error }, status);
const enc = new TextEncoder();

function safeEqual(a, b) {
  const x = enc.encode(a || ''), y = enc.encode(b || '');
  if (x.length !== y.length) return false;
  return crypto.subtle.timingSafeEqual(x, y);
}
const isStaff = (req, env) => !!env.STAFF_TOKEN && safeEqual((req.headers.get('authorization') || '').replace(/^Bearer /, ''), env.STAFF_TOKEN);

const randomToken = () => [...crypto.getRandomValues(new Uint8Array(18))].map(b => b.toString(16).padStart(2, '0')).join('');
const cleanName = name => (name || 'file').replace(/[\\/\0\r\n"]/g, '_').slice(0, 180);
const log = (env, document_id, kind, detail) => env.DB.prepare('INSERT INTO events (document_id, kind, detail) VALUES (?, ?, ?)').bind(document_id, kind, detail).run();

// ─── INGEST: every channel ends here ────────────────────────────────────
async function ingest(env, { filename, bytes, mime, channel, sender, uploaderId }) {
  filename = cleanName(filename);
  if (bytes.byteLength > MAX_BYTES) return { filename, error: 'File is larger than 20 MB' };
  if (!ALLOWED.test(filename)) return { filename, error: 'File type not accepted' };

  const file_key = crypto.randomUUID();
  await env.FILES.put(file_key, bytes, { metadata: { filename, mime } });

  const { results: clients } = await env.DB.prepare('SELECT id, name, pan, phone, email, group_name FROM clients').all();
  const rule = await env.DB.prepare('SELECT client_id, doc_type, hits FROM rules WHERE key = ?').bind(ruleKey(filename)).first();
  const r = classify({ filename, sender, clients, rule, uploaderId });
  const status = r.client_id && r.confidence >= AUTO_FILE ? 'filed' : 'review';

  const row = await env.DB.prepare(
    `INSERT INTO documents (filename, file_key, size, mime, channel, sender, client_id, doc_type, period, confidence, reasons, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`)
    .bind(filename, file_key, bytes.byteLength, mime || null, channel, sender || null, r.client_id, r.doc_type, r.period, r.confidence, JSON.stringify(r.reasons), status)
    .first();
  await log(env, row.id, status === 'filed' ? 'auto_filed' : 'needs_review', r.reasons.join('; '));
  const client = clients.find(c => c.id === r.client_id);
  return { id: row.id, filename, status, client: client?.name || null, doc_type: r.doc_type, period: r.period, confidence: r.confidence, reasons: r.reasons };
}

// ─── WHATSAPP (Meta Cloud API) ──────────────────────────────────────────
async function verifyMeta(req, env, raw) {
  const sig = req.headers.get('x-hub-signature-256') || '';
  const key = await crypto.subtle.importKey('raw', enc.encode(env.WHATSAPP_APP_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(raw)));
  return safeEqual(sig, 'sha256=' + [...mac].map(b => b.toString(16).padStart(2, '0')).join(''));
}

// Returns { ok, error }. Meta's error 131047 means the client hasn't written in 24 h, so only an approved template can reach them.
async function waPost(env, message) {
  const res = await fetch(`${graph(env)}/${env.WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.WHATSAPP_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...message }),
  });
  if (res.ok) return { ok: true };
  const e = (await res.json().catch(() => ({}))).error || {};
  const error = e.code === 131047
    ? 'Client has not messaged in the last 24 hours. Set an approved WhatsApp template to reach them.'
    : `WhatsApp error ${e.code || res.status}: ${e.message || 'request failed'}`;
  console.error('WhatsApp send failed', error);
  return { ok: false, error };
}
const waSend = (env, to, text) => waPost(env, { to, type: 'text', text: { body: text } });
const template = (env, to, name, params, header) => waPost(env, {
  to, type: 'template',
  template: { name, language: { code: env.WHATSAPP_TEMPLATE_LANG || 'en' }, components: [
    ...(header ? [{ type: 'header', parameters: [header] }] : []),
    { type: 'body', parameters: params.map(text => ({ type: 'text', text: String(text) })) },
  ] },
});

async function waUpload(env, bytes, mime, filename) {
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', mime);
  form.append('file', new Blob([bytes], { type: mime }), filename);
  const res = await fetch(`${graph(env)}/${env.WHATSAPP_PHONE_ID}/media`, { method: 'POST', headers: { authorization: `Bearer ${env.WHATSAPP_TOKEN}` }, body: form });
  const b = await res.json().catch(() => ({}));
  if (!b.id) throw new Error(`WhatsApp media upload failed: ${b.error?.message || res.status}`);
  return b.id;
}

// What an open filing is still waiting for, from documents received in the 120 days before it's due
async function filingStatus(env, f) {
  const { results } = await env.DB.prepare(
    `SELECT DISTINCT doc_type FROM documents WHERE client_id = ? AND status != 'review' AND channel != 'outbound' AND created_at >= date(?, '-120 days')`)
    .bind(f.client_id, f.due_date).all();
  return missingDocs(JSON.parse(f.required || '[]'), results.map(r => r.doc_type));
}

async function sendReminder(env, f, missing, now) {
  const to = waNumber(f.phone);
  if (!to) return { ok: false, error: 'Client has no WhatsApp number' };
  const days = daysLeft(f.due_date, now);
  return env.WHATSAPP_REMINDER_TEMPLATE
    ? template(env, to, env.WHATSAPP_REMINDER_TEMPLATE, [f.name.split(' ')[0], f.title, `${dueText(days)} (${f.due_date})`, missing.join(', ')])
    : waSend(env, to, reminderText(f.name, f.title, f.due_date, missing, days));
}

async function remind(env, f, missing, now, why) {
  const r = await sendReminder(env, f, missing, now);
  await env.DB.batch([
    ...(r.ok ? [env.DB.prepare(`UPDATE filings SET reminders_sent = reminders_sent + 1, last_reminder_at = CURRENT_TIMESTAMP, last_error = NULL WHERE id = ?`).bind(f.id)]
      : [env.DB.prepare('UPDATE filings SET last_error = ? WHERE id = ?').bind(r.error, f.id)]),
    env.DB.prepare('INSERT INTO events (filing_id, kind, detail) VALUES (?, ?, ?)')
      .bind(f.id, r.ok ? 'reminder_sent' : 'reminder_failed', r.ok ? `${why}: ${f.name} · missing ${missing.join(', ')}` : `Reminder to ${f.name} failed. ${r.error}`),
  ]);
  return r;
}

// Daily cron: remind everyone whose filing is close and still missing documents
export async function runReminders(env, now = Date.now()) {
  if (!waReady(env)) return { skipped: 'WhatsApp not configured' };
  const { results } = await env.DB.prepare(
    `SELECT f.*, c.name, c.phone FROM filings f JOIN clients c ON c.id = f.client_id WHERE f.status = 'open'`).all();
  const out = [];
  for (const f of results) {
    const missing = await filingStatus(env, f);
    const due = reminderDue(f, missing, now);
    if (!due) continue;
    const r = await remind(env, f, missing, now, 'Scheduled reminder');
    if (r.ok && due.escalate && !f.escalated) {
      await env.DB.batch([
        env.DB.prepare('UPDATE filings SET escalated = 1 WHERE id = ?').bind(f.id),
        env.DB.prepare('INSERT INTO events (filing_id, kind, detail) VALUES (?, ?, ?)').bind(f.id, 'escalated', `${f.name} has not sent ${missing.join(', ')} and ${f.title} ${dueText(due.days)}. Call them.`),
      ]);
    }
    out.push({ id: f.id, ...r });
  }
  return { checked: results.length, sent: out };
}

async function waMessage(env, msg) {
  const media = msg.document || msg.image;
  if (!media) {
    if (msg.type === 'text') await waSend(env, msg.from, 'Hi! Send your documents here as files or photos and we will file them for you.');
    return;
  }
  const auth = { authorization: `Bearer ${env.WHATSAPP_TOKEN}` };
  const meta = await (await fetch(`${graph(env)}/${media.id}`, { headers: auth })).json();
  if (!meta.url) throw new Error('WhatsApp media lookup failed: ' + JSON.stringify(meta));
  const bytes = await (await fetch(meta.url, { headers: auth })).arrayBuffer();
  const ext = (meta.mime_type || '').split('/')[1]?.replace('jpeg', 'jpg') || 'bin';
  const filename = msg.document?.filename || `WhatsApp_photo_${msg.timestamp}.${ext}`;
  const r = await ingest(env, { filename, bytes, mime: meta.mime_type, channel: 'whatsapp', sender: msg.from });
  let reply = r.error ? `We couldn't accept ${r.filename}: ${r.error}.`
    : r.status === 'filed' ? `Received ${r.filename} ✓ Filed under ${r.client} · ${r.doc_type}.`
    : `Received ${r.filename} ✓ Our team will check it shortly.`;
  // Tell them what's still outstanding, so they don't wait for the next reminder
  if (r.status === 'filed') {
    const { results } = await env.DB.prepare(
      `SELECT f.* FROM filings f JOIN documents d ON d.client_id = f.client_id WHERE d.id = ? AND f.status = 'open'`).bind(r.id).all();
    for (const f of results) {
      const missing = await filingStatus(env, f);
      reply += missing.length ? `\n\nStill needed for ${f.title}: ${missing.join(', ')}.` : `\n\nThat's everything we need for ${f.title} ✓`;
    }
  }
  await waSend(env, msg.from, reply);
}

async function whatsapp(req, env, ctx) {
  if (!env.WHATSAPP_TOKEN || !env.WHATSAPP_APP_SECRET || !env.WHATSAPP_PHONE_ID) return fail(503, 'WhatsApp is not configured');
  if (req.method === 'GET') { // Meta's one-time webhook verification
    const u = new URL(req.url);
    return u.searchParams.get('hub.mode') === 'subscribe' && safeEqual(u.searchParams.get('hub.verify_token'), env.WHATSAPP_VERIFY_TOKEN)
      ? new Response(u.searchParams.get('hub.challenge')) : fail(403, 'Bad verify token');
  }
  const raw = await req.text();
  if (!(await verifyMeta(req, env, raw))) return fail(401, 'Bad signature');
  const body = JSON.parse(raw);
  const msgs = (body.entry || []).flatMap(e => (e.changes || []).flatMap(c => c.value?.messages || []));
  // Ack fast so Meta doesn't retry; do the work in the background
  ctx.waitUntil(Promise.all(msgs.map(m => waMessage(env, m).catch(e => console.error('WhatsApp message failed', e)))));
  return json({ ok: true });
}

// ─── API ────────────────────────────────────────────────────────────────
async function upload(req, env) {
  const url = new URL(req.url);
  let uploaderId = null, sender = null;
  if (isStaff(req, env)) {
    sender = null;
  } else {
    const t = url.searchParams.get('t');
    const c = t && await env.DB.prepare('SELECT id, phone, email FROM clients WHERE upload_token = ?').bind(t).first();
    if (!c) return fail(401, 'Invalid upload link');
    uploaderId = c.id; sender = c.phone || c.email;
  }
  const form = await req.formData();
  if (isStaff(req, env)) sender = form.get('sender') || null;
  const files = form.getAll('files').filter(f => typeof f === 'object');
  if (!files.length) return fail(400, 'No files');
  if (files.length > 20) return fail(400, 'At most 20 files per upload');
  const results = [];
  for (const f of files) results.push(await ingest(env, { filename: f.name, bytes: await f.arrayBuffer(), mime: f.type, channel: 'upload', sender, uploaderId }));
  return json({ results });
}

async function api(req, env, path) {
  const m = req.method;
  if (path === '/api/upload' && m === 'POST') return upload(req, env);
  if (path === '/api/upload-info' && m === 'GET') {
    const t = new URL(req.url).searchParams.get('t');
    const c = t && await env.DB.prepare('SELECT name FROM clients WHERE upload_token = ?').bind(t).first();
    return c ? json({ name: c.name.split(' ')[0] }) : fail(404, 'Invalid upload link');
  }
  if (!isStaff(req, env)) return fail(401, 'Staff token required');

  if (path === '/api/session' && m === 'GET') return json({ ok: true, doc_types: DOC_TYPES, whatsapp: waReady(env),
    templates: { reminder: env.WHATSAPP_REMINDER_TEMPLATE || null, delivery: env.WHATSAPP_DELIVERY_TEMPLATE || null } });

  // ─── Filings: deadlines, reminders, delivery ──
  if (path === '/api/filings' && m === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT f.*, c.name, c.phone FROM filings f JOIN clients c ON c.id = f.client_id ORDER BY f.status = 'open' DESC, f.due_date`).all();
    const now = Date.now();
    for (const f of results) {
      f.required = JSON.parse(f.required || '[]');
      f.missing = f.status === 'open' ? await filingStatus(env, { ...f, required: JSON.stringify(f.required) }) : [];
      f.days_left = daysLeft(f.due_date, now);
    }
    return json(results);
  }
  if (path === '/api/filings' && m === 'POST') {
    const b = await req.json();
    const client = await env.DB.prepare('SELECT id FROM clients WHERE id = ?').bind(b.client_id).first();
    if (!client) return fail(400, 'Choose a client');
    if (!(b.title || '').trim()) return fail(400, 'Give the filing a name, e.g. GST return Q3');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.due_date || '')) return fail(400, 'Due date is required');
    const required = (b.required || []).filter(t => DOC_TYPES.includes(t));
    if (!required.length) return fail(400, 'Pick at least one document the client must send');
    const row = await env.DB.prepare('INSERT INTO filings (client_id, title, due_date, required) VALUES (?, ?, ?, ?) RETURNING id')
      .bind(client.id, b.title.trim(), b.due_date, JSON.stringify(required)).first();
    return json(row, 201);
  }
  let fm = path.match(/^\/api\/filings\/(\d+)(?:\/(remind|deliver))?$/);
  if (fm) {
    const f = await env.DB.prepare('SELECT f.*, c.name, c.phone FROM filings f JOIN clients c ON c.id = f.client_id WHERE f.id = ?').bind(fm[1]).first();
    if (!f) return fail(404, 'Filing not found');
    if (fm[2] === 'remind' && m === 'POST') {
      if (!waReady(env)) return fail(503, 'WhatsApp is not connected');
      const missing = await filingStatus(env, f);
      if (!missing.length) return fail(400, 'Nothing is missing for this filing');
      const r = await remind(env, f, missing, Date.now(), 'Sent by staff');
      return r.ok ? json({ ok: true }) : fail(502, r.error);
    }
    if (fm[2] === 'deliver' && m === 'POST') {
      const form = await req.formData();
      const files = form.getAll('files').filter(x => typeof x === 'object');
      const ack = (form.get('ack_no') || '').toString().trim().slice(0, 60) || null;
      if (!files.length) return fail(400, 'Attach the filed return or acknowledgement');
      const to = waNumber(f.phone);
      const sent = [], errors = [];
      for (const file of files) {
        const filename = cleanName(file.name), bytes = await file.arrayBuffer(), mime = file.type || 'application/pdf';
        if (bytes.byteLength > MAX_BYTES || !ALLOWED.test(filename)) { errors.push(`${filename}: not accepted`); continue; }
        const file_key = crypto.randomUUID();
        await env.FILES.put(file_key, bytes, { metadata: { filename, mime } });
        await env.DB.prepare(`INSERT INTO documents (filename, file_key, size, mime, channel, client_id, doc_type, status, decided_by) VALUES (?, ?, ?, ?, 'outbound', ?, 'Other', 'confirmed', 'staff')`)
          .bind(filename, file_key, bytes.byteLength, mime, f.client_id).run();
        if (!waReady(env) || !to) { errors.push(`${filename}: ${to ? 'WhatsApp is not connected' : 'client has no WhatsApp number'}`); continue; }
        try {
          const id = await waUpload(env, bytes, mime, filename);
          const doc = { type: 'document', document: { id, filename } };
          const r = env.WHATSAPP_DELIVERY_TEMPLATE
            ? await template(env, to, env.WHATSAPP_DELIVERY_TEMPLATE, [f.name.split(' ')[0], f.title, ack || '—'], doc)
            : await waPost(env, { to, ...doc, document: { id, filename, caption: `${f.title} filed${ack ? ` · Acknowledgement ${ack}` : ''}` } });
          r.ok ? sent.push(filename) : errors.push(`${filename}: ${r.error}`);
        } catch (e) { errors.push(`${filename}: ${e.message}`); }
      }
      const status = sent.length && !errors.length ? 'delivered' : 'filed';
      await env.DB.batch([
        env.DB.prepare('UPDATE filings SET status = ?, ack_no = COALESCE(?, ack_no), last_error = ? WHERE id = ?').bind(status, ack, errors.join('; ') || null, f.id),
        env.DB.prepare('INSERT INTO events (filing_id, kind, detail) VALUES (?, ?, ?)').bind(f.id, status === 'delivered' ? 'delivered' : 'delivery_failed',
          status === 'delivered' ? `${f.title} sent to ${f.name} on WhatsApp: ${sent.join(', ')}` : `Delivery to ${f.name} failed. ${errors.join('; ')}`),
      ]);
      return json({ status, sent, errors, ...(sent.length ? {} : { error: errors.join('; ') }) }, errors.length && !sent.length ? 502 : 200);
    }
    if (!fm[2] && m === 'DELETE') {
      await env.DB.prepare('DELETE FROM filings WHERE id = ?').bind(f.id).run();
      return json({ ok: true });
    }
  }
  if (path === '/api/events' && m === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT e.*, f.title, c.name FROM events e LEFT JOIN filings f ON f.id = e.filing_id LEFT JOIN clients c ON c.id = f.client_id
       WHERE e.filing_id IS NOT NULL ORDER BY e.id DESC LIMIT 40`).all();
    return json(results);
  }
  // Manual trigger for the daily job (also handy to test)
  if (path === '/api/reminders/run' && m === 'POST') return json(await runReminders(env));

  if (path === '/api/stats' && m === 'GET') {
    const r = await env.DB.prepare(`SELECT
      (SELECT COUNT(*) FROM documents WHERE status = 'review') AS review,
      (SELECT COUNT(*) FROM documents WHERE status != 'review' AND created_at >= date('now')) AS filed_today,
      (SELECT COUNT(*) FROM documents WHERE status = 'filed') AS auto_total,
      (SELECT COUNT(*) FROM documents) AS total,
      (SELECT COUNT(*) FROM clients) AS clients,
      (SELECT COUNT(*) FROM rules) AS rules`).first();
    return json(r);
  }

  if (path === '/api/documents' && m === 'GET') {
    const status = new URL(req.url).searchParams.get('status');
    const where = ['review', 'filed', 'confirmed'].includes(status) ? 'WHERE d.status = ?' : '';
    const q = env.DB.prepare(`SELECT d.*, c.name AS client FROM documents d LEFT JOIN clients c ON c.id = d.client_id ${where} ORDER BY d.id DESC LIMIT 200`);
    const { results } = await (where ? q.bind(status) : q).all();
    return json(results.map(d => ({ ...d, reasons: JSON.parse(d.reasons || '[]') })));
  }

  let mm = path.match(/^\/api\/documents\/(\d+)\/file$/);
  if (mm && m === 'GET') {
    const d = await env.DB.prepare('SELECT file_key, filename, mime FROM documents WHERE id = ?').bind(mm[1]).first();
    const body = d && await env.FILES.get(d.file_key, 'stream');
    if (!body) return fail(404, 'File not found');
    return new Response(body, { headers: { 'content-type': d.mime || 'application/octet-stream', 'content-disposition': `inline; filename="${d.filename}"`, 'x-content-type-options': 'nosniff' } });
  }

  mm = path.match(/^\/api\/documents\/(\d+)\/confirm$/);
  if (mm && m === 'POST') {
    const { client_id, doc_type } = await req.json();
    const doc = await env.DB.prepare('SELECT id, filename FROM documents WHERE id = ?').bind(mm[1]).first();
    const client = await env.DB.prepare('SELECT id, name FROM clients WHERE id = ?').bind(client_id).first();
    if (!doc || !client) return fail(404, 'Document or client not found');
    if (!DOC_TYPES.includes(doc_type)) return fail(400, 'Unknown document type');
    await env.DB.batch([
      env.DB.prepare(`UPDATE documents SET client_id = ?, doc_type = ?, status = 'confirmed', decided_by = 'staff' WHERE id = ?`).bind(client.id, doc_type, doc.id),
      // Learning: the next file with the same shaped name is filed without asking
      env.DB.prepare(`INSERT INTO rules (key, client_id, doc_type) VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET hits = CASE WHEN client_id = excluded.client_id THEN hits + 1 ELSE 1 END, client_id = excluded.client_id, doc_type = excluded.doc_type`)
        .bind(ruleKey(doc.filename), client.id, doc_type),
      env.DB.prepare('INSERT INTO events (document_id, kind, detail) VALUES (?, ?, ?)').bind(doc.id, 'confirmed', `${client.name} · ${doc_type}`),
    ]);
    return json({ ok: true, rule: ruleKey(doc.filename) });
  }

  if (path === '/api/clients' && m === 'GET') {
    const { results } = await env.DB.prepare(`SELECT c.*, (SELECT COUNT(*) FROM documents d WHERE d.client_id = c.id) AS documents FROM clients c ORDER BY c.group_name, c.name`).all();
    return json(results);
  }
  if (path === '/api/clients' && m === 'POST') {
    const b = await req.json();
    const name = (b.name || '').trim();
    if (!name) return fail(400, 'Name is required');
    const pan = (b.pan || '').trim().toUpperCase() || null;
    if (pan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)) return fail(400, 'PAN must look like ABCDE1234F');
    const row = await env.DB.prepare(
      'INSERT INTO clients (name, kind, pan, phone, email, group_name, upload_token) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *')
      .bind(name, b.kind === 'company' ? 'company' : 'individual', pan, (b.phone || '').trim() || null, (b.email || '').trim().toLowerCase() || null, (b.group_name || '').trim() || null, randomToken())
      .first();
    return json(row, 201);
  }
  mm = path.match(/^\/api\/clients\/(\d+)$/);
  if (mm && m === 'DELETE') {
    const used = await env.DB.prepare('SELECT (SELECT COUNT(*) FROM documents WHERE client_id = ?1) + (SELECT COUNT(*) FROM filings WHERE client_id = ?1) AS n').bind(mm[1]).first();
    if (used.n) return fail(409, 'Client has documents or filings; remove those first');
    await env.DB.batch([env.DB.prepare('DELETE FROM rules WHERE client_id = ?').bind(mm[1]), env.DB.prepare('DELETE FROM clients WHERE id = ?').bind(mm[1])]);
    return json({ ok: true });
  }
  return fail(404, 'Not found');
}

export default {
  async fetch(req, env, ctx) {
    const path = new URL(req.url).pathname;
    try {
      if (path === '/webhooks/whatsapp') return await whatsapp(req, env, ctx);
      if (path.startsWith('/api/')) return await api(req, env, path);
      return env.ASSETS.fetch(req);
    } catch (e) {
      console.error(e);
      return fail(500, 'Something went wrong');
    }
  },

  // Cron (wrangler.toml): daily deadline reminders
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runReminders(env).then(r => console.log('reminders', JSON.stringify(r))));
  },

  // Cloudflare Email Routing: forward docs@yourdomain to this Worker
  async email(message, env) {
    const mail = await PostalMime.parse(message.raw);
    const sender = message.from;
    const files = (mail.attachments || []).filter(a => a.filename);
    if (!files.length) return;
    for (const a of files) {
      const bytes = typeof a.content === 'string' ? enc.encode(a.content).buffer : a.content;
      await ingest(env, { filename: a.filename, bytes, mime: a.mimeType, channel: 'email', sender });
    }
  },
};
