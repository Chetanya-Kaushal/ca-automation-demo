CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'individual',      -- individual | company
  pan TEXT,
  phone TEXT,
  email TEXT,
  group_name TEXT,                              -- family or company group; members can send each other's files
  upload_token TEXT UNIQUE,                     -- private upload link for this client
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY,
  filename TEXT NOT NULL,
  file_key TEXT NOT NULL,                       -- key in the FILES KV namespace
  size INTEGER,
  mime TEXT,
  channel TEXT NOT NULL,                        -- upload | whatsapp | email
  sender TEXT,
  client_id INTEGER REFERENCES clients(id),
  doc_type TEXT,
  period TEXT,
  confidence REAL,
  reasons TEXT,                                 -- JSON array of strings
  status TEXT NOT NULL,                         -- filed (automatic) | review | confirmed (by staff)
  decided_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status, id);

-- Learned from staff confirmations: filename shape -> client
CREATE TABLE IF NOT EXISTS rules (
  key TEXT PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  doc_type TEXT,
  hits INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  document_id INTEGER,
  kind TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
