-- Missed-call receptionist intake. No raw audio or recordings are stored.
CREATE TABLE IF NOT EXISTS phone_inquiries (
  call_sid TEXT PRIMARY KEY,
  caller_number TEXT,
  customer_name TEXT,
  project_details TEXT,
  intent TEXT NOT NULL DEFAULT 'pending' CHECK (intent IN ('pending', 'project', 'solicitation', 'collection', 'robocall')),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'new', 'read', 'archived', 'solicitation', 'collection', 'robocall')),
  alert_sent INTEGER NOT NULL DEFAULT 0,
  alert_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_phone_inquiries_status_created
ON phone_inquiries(status, created_at DESC);
