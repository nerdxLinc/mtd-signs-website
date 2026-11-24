-- Limits use of the public AI endpoint, separate from customer submissions.
-- Store a one-way hash of the connection address, not the address itself.
CREATE TABLE IF NOT EXISTS assistant_rate_limits (
  hour_bucket TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (hour_bucket, visitor_hash)
);
