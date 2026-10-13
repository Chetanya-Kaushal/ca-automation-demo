import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, docType, period, ruleKey, AUTO_FILE } from '../src/classify.js';

const clients = [
  { id: 1, name: 'Rajesh Mehta', pan: 'ABCPM1234K', phone: '+91 98200 11111', email: 'rajesh.mehta@gmail.com', group_name: 'Mehta' },
  { id: 2, name: 'Priya Mehta', phone: '9820022222', group_name: 'Mehta' },
  { id: 3, name: 'ABC Pvt Ltd', kind: 'company', group_name: 'Mehta' },
  { id: 4, name: 'Meera Sharma', phone: '9820033333', group_name: null },
  { id: 5, name: 'Amit Patel', phone: '9820044444', group_name: null },
];

test('document types from filenames', () => {
  assert.equal(docType('Form16_Priya.pdf'), 'Form 16');
  assert.equal(docType('ITR_Rajesh_2024.pdf'), 'ITR');
  assert.equal(docType('Bank_SBI_Meera.pdf'), 'Bank statement');
  assert.equal(docType('Tally_ABCPvt.xlsx'), 'Tally export');
  assert.equal(docType('ITC_Summary_Q3.xlsx'), 'ITC summary');
  assert.equal(docType('GSTR3B_Mar.pdf'), 'GST return');
  assert.equal(docType('holiday.jpg'), 'Other');
  assert.equal(docType('Waiting_list.pdf'), 'Other'); // "ais" inside a word is not AIS
});

test('periods', () => {
  assert.equal(period('ITR_2024-25.pdf'), '2024-25');
  assert.equal(period('Sales_Invoices_Q3_2024.pdf'), 'Q3 2024');
  assert.equal(period('ITR_Rajesh_2024.pdf'), '2024');
  assert.equal(period('scan.pdf'), null);
});

test('rule key ignores numbers', () => {
  assert.equal(ruleKey('ITR_Rajesh_2024.pdf'), 'itr_rajesh');
  assert.equal(ruleKey('ITR_Rajesh_2025.pdf'), 'itr_rajesh');
});

test('family email: each file goes to the person it names', () => {
  const s = 'rajesh.mehta@gmail.com';
  const r1 = classify({ filename: 'ITR_Rajesh_2024.pdf', sender: s, clients });
  const r2 = classify({ filename: 'Form16_Priya.pdf', sender: s, clients });
  const r3 = classify({ filename: 'Tally_ABCPvt.xlsx', sender: s, clients });
  assert.equal(r1.client_id, 1); assert.ok(r1.confidence >= AUTO_FILE);
  assert.equal(r2.client_id, 2); assert.ok(r2.confidence >= AUTO_FILE);
  assert.equal(r3.client_id, 3); assert.ok(r3.confidence >= AUTO_FILE);
});

test('ambiguous surname goes to review', () => {
  const r = classify({ filename: 'Mehta_docs.pdf', sender: 'rajesh.mehta@gmail.com', clients });
  assert.ok(r.confidence < AUTO_FILE);
  assert.ok(r.reasons.some(x => x.startsWith('Also matches')));
});

test('unnamed bank file from a solo client is theirs', () => {
  const r = classify({ filename: 'Bank_statement_0012.pdf', sender: '919820033333', clients });
  assert.equal(r.client_id, 4);
  assert.ok(r.confidence >= AUTO_FILE);
});

test('unnamed file from a family sender needs review', () => {
  const r = classify({ filename: 'Bank_statement.pdf', sender: 'rajesh.mehta@gmail.com', clients });
  assert.equal(r.client_id, 1);
  assert.ok(r.confidence < AUTO_FILE);
});

test('unrecognised file type always needs review', () => {
  const r = classify({ filename: 'scan_0012.pdf', sender: '919820033333', clients });
  assert.equal(r.client_id, 4);
  assert.ok(r.confidence < AUTO_FILE);
});

test('unknown sender with no name -> unassigned', () => {
  const r = classify({ filename: 'doc.pdf', sender: '911234567890', clients });
  assert.equal(r.client_id, null);
  assert.equal(r.confidence, 0);
});

test('PAN in filename wins', () => {
  const r = classify({ filename: '26AS_ABCPM1234K.pdf', sender: '9820033333', clients });
  assert.equal(r.client_id, 1); assert.equal(r.confidence, 0.99);
});

test('learned rule wins over guessing', () => {
  const r = classify({ filename: 'Mehta_docs_2025.pdf', clients, rule: { client_id: 3, doc_type: 'Tally export', hits: 2 } });
  assert.equal(r.client_id, 3); assert.equal(r.doc_type, 'Tally export'); assert.ok(r.confidence >= AUTO_FILE);
});

test('client upload link scopes to their group', () => {
  const r = classify({ filename: 'Bank_statement.pdf', clients, uploaderId: 4 });
  assert.equal(r.client_id, 4);
  const r2 = classify({ filename: 'Form16_Priya.pdf', clients, uploaderId: 1 });
  assert.equal(r2.client_id, 2); assert.ok(r2.confidence >= AUTO_FILE);
});
