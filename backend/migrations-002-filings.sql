-- Run once on databases created before filings existed:
--   npx wrangler d1 execute ledger-hackers --remote --file migrations-002-filings.sql
ALTER TABLE events ADD COLUMN filing_id INTEGER;
-- A return the firm must file for a client, with the documents it needs
CREATE TABLE IF NOT EXISTS filings (
  id INTEGER PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  title TEXT NOT NULL,                          -- e.g. GST return Q3
  due_date TEXT NOT NULL,                       -- YYYY-MM-DD
  required TEXT NOT NULL,                       -- JSON array of document types the client must send
  status TEXT NOT NULL DEFAULT 'open',          -- open | filed | delivered
  ack_no TEXT,
  reminders_sent INTEGER NOT NULL DEFAULT 0,
  last_reminder_at TEXT,
  last_error TEXT,
  escalated INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
