// Rule-based document classifier: filename keywords + sender match + learned CA rules.
// ponytail: reads the filename only, never the file contents. Swap in OCR/AI when filenames stop being enough.

export const AUTO_FILE = 0.85; // at or above this, a document is filed without a person

const TYPES = [
  ['Form 16', /form[\s_-]?16/i],
  ['Form 26AS', /26as/i],
  ['AIS', /(^|[^a-z])(ais|tis)([^a-z]|$)/i],
  ['GST return', /gstr[\s_-]?\d/i],
  ['Sales invoices', /sales/i],
  ['Purchase invoices', /purchase/i],
  ['ITC summary', /(^|[^a-z])itc([^a-z]|$)/i],
  ['ITR', /(^|[^a-z])itr([^a-z]|$)/i],
  ['Bank statement', /bank|statement|(^|[^a-z])(sbi|hdfc|icici|axis|kotak|pnb|bob)([^a-z]|$)/i],
  ['Tally export', /tally/i],
  ['Invoice', /invoice/i],
];
export const DOC_TYPES = [...TYPES.map(([t]) => t), 'Other'];

const STOP = new Set(['pvt', 'ltd', 'private', 'limited', 'and', 'the', 'llp', 'co', 'mr', 'mrs', 'ms']);
const PAN = /[A-Z]{5}\d{4}[A-Z]/;

export const stem = filename => filename.replace(/\.[^.]+$/, '');
export const tokens = filename => stem(filename).replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
// Same shape of filename from the same client maps to the same rule: "ITR_Rajesh_2024.pdf" -> "itr_rajesh"
export const ruleKey = filename => tokens(filename).filter(t => !/\d/.test(t)).join('_');
export const digits = s => (s || '').replace(/\D/g, '').slice(-10);
const compact = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export function docType(filename) {
  const s = stem(filename);
  return (TYPES.find(([, re]) => re.test(s)) || ['Other'])[0];
}

export function period(filename) {
  const s = stem(filename);
  let m = s.match(/(20\d{2})[\s_-]?(\d{2})(?!\d)/);
  if (m && +m[2] === (+m[1] + 1) % 100) return `${m[1]}-${m[2]}`;
  m = s.match(/\b(q[1-4])\b|_(q[1-4])(?=[_.-]|$)/i);
  const q = m && (m[1] || m[2]).toUpperCase();
  const y = s.match(/20\d{2}/)?.[0];
  return [q, y].filter(Boolean).join(' ') || null;
}

// Which clients does a sender speak for? The sender plus everyone in their group (family / company).
export function senderGroup(sender, clients) {
  if (!sender) return [];
  const d = digits(sender), e = sender.toLowerCase().trim();
  const me = clients.filter(c => (d.length === 10 && digits(c.phone) === d) || (c.email && c.email.toLowerCase() === e));
  const groups = new Set(me.map(c => c.group_name).filter(Boolean));
  return clients.filter(c => me.includes(c) || groups.has(c.group_name));
}

function nameScore(client, toks) {
  const words = client.name.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !STOP.has(w));
  const full = compact(client.name);
  let hits = words.filter(w => toks.includes(w)).length;
  // "ABCPvt" -> matches "ABC Pvt Ltd"
  if (!hits && toks.some(t => t.length >= 4 && full.startsWith(t))) hits = 1;
  return hits;
}

/**
 * @param {object} p
 * @param {string} p.filename
 * @param {string} [p.sender]   phone or email the file came from
 * @param {object[]} p.clients  rows from the clients table
 * @param {object} [p.rule]     learned rule for ruleKey(filename), if any
 * @param {number} [p.uploaderId] client id when the upload came through a client's own link
 */
export function classify({ filename, sender, clients, rule, uploaderId }) {
  const type = docType(filename);
  const result = { client_id: null, doc_type: type, period: period(filename), confidence: 0, reasons: [] };
  const byId = id => clients.find(c => c.id === id);

  const pan = stem(filename).toUpperCase().match(PAN)?.[0];
  const panClient = pan && clients.find(c => c.pan && c.pan.toUpperCase() === pan);
  if (panClient) return { ...result, client_id: panClient.id, confidence: 0.99, reasons: [`PAN ${pan} matches ${panClient.name}`] };

  if (rule && byId(rule.client_id)) {
    return { ...result, client_id: rule.client_id, doc_type: rule.doc_type || type, confidence: 0.97,
      reasons: [`Learned rule: CA confirmed this file pattern ${rule.hits}×`] };
  }

  const uploader = uploaderId ? byId(uploaderId) : null;
  const group = uploader ? clients.filter(c => c === uploader || (uploader.group_name && c.group_name === uploader.group_name)) : senderGroup(sender, clients);
  const toks = tokens(filename);
  const direct = uploader ? [uploader] : senderGroup(sender, clients.map(c => ({ ...c, group_name: null })));
  const scored = clients.map(c => {
    const hits = nameScore(c, toks), inGroup = group.includes(c);
    let s = 0;
    if (hits) s = 0.6 + 0.05 * (hits - 1) + (inGroup ? 0.3 : 0);
    // The sender themself beats their relatives; a sender with no group can only mean themself
    else if (inGroup) s = direct.some(d => d.id === c.id) ? (group.length === 1 ? 0.9 : 0.5) : 0.2;
    return { c, s, hits, inGroup };
  }).filter(x => x.s > 0).sort((a, b) => b.s - a.s);

  if (!scored.length) return { ...result, reasons: [sender ? `Sender ${sender} is not a known client` : 'No client name in filename'] };
  const [top, next] = scored;
  let conf = Math.min(top.s, 0.95);
  const reasons = [];
  if (top.hits) reasons.push(`Filename names ${top.c.name}`);
  if (top.inGroup) reasons.push(uploader ? `Uploaded via ${uploader.name}'s link` : `Sent by ${sender}, same group`);
  if (next && top.s - next.s < 0.15) {
    conf = Math.min(conf, 0.35);
    reasons.push(`Also matches ${next.c.name}`);
  }
  if (type === 'Other') { conf = Math.min(conf, 0.6); reasons.push('Document type not recognised'); }
  return { ...result, client_id: top.c.id, confidence: Math.round(conf * 100) / 100, reasons };
}
