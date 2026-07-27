-- ตัวอย่าง migration แบบ versioned (ใช้กับ golang-migrate / goose)
-- ไฟล์นี้เป็นเอกสารประกอบ — รันผ่านเครื่องมือ migrate จริงในโปรเจกต์คุณ
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now (),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now ()
);

CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);
