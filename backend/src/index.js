import PostalMime from 'postal-mime';
import { classify, ruleKey, AUTO_FILE, DOC_TYPES } from './classify.js';

const MAX_BYTES = 20 * 1024 * 1024; // KV values cap at 25 MB
const ALLOWED = /\.(pdf|xlsx?|csv|jpe?g|png|heic|zip|json|xml|txt)$/i;
const GRAPH = 'https://graph.facebook.com/v21.0';

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

async function waSend(env, to, text) {
  const res = await fetch(`${GRAPH}/${env.WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.WHATSAPP_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
  });
  if (!res.ok) console.error('WhatsApp send failed', res.status, await res.text());
}

async function waMessage(env, msg) {
  const media = msg.document || msg.image;
  if (!media) {
    if (msg.type === 'text') await waSend(env, msg.from, 'Hi! Send your documents here as files or photos and we will file them for you.');
    return;
  }
  const auth = { authorization: `Bearer ${env.WHATSAPP_TOKEN}` };
  const meta = await (await fetch(`${GRAPH}/${media.id}`, { headers: auth })).json();
  if (!meta.url) throw new Error('WhatsApp media lookup failed: ' + JSON.stringify(meta));
  const bytes = await (await fetch(meta.url, { headers: auth })).arrayBuffer();
  const ext = (meta.mime_type || '').split('/')[1]?.replace('jpeg', 'jpg') || 'bin';
  const filename = msg.document?.filename || `WhatsApp_photo_${msg.timestamp}.${ext}`;
  const r = await ingest(env, { filename, bytes, mime: meta.mime_type, channel: 'whatsapp', sender: msg.from });
  const reply = r.error ? `We couldn't accept ${r.filename}: ${r.error}.`
    : r.status === 'filed' ? `Received ${r.filename} ✓ Filed under ${r.client} · ${r.doc_type}.`
    : `Received ${r.filename} ✓ Our team will check it shortly.`;
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

  if (path === '/api/session' && m === 'GET') return json({ ok: true, doc_types: DOC_TYPES, whatsapp: !!env.WHATSAPP_TOKEN });

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
    const used = await env.DB.prepare('SELECT COUNT(*) AS n FROM documents WHERE client_id = ?').bind(mm[1]).first();
    if (used.n) return fail(409, 'Client has documents; reassign them first');
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
