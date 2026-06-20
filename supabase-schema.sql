-- =====================================================
-- SUPABASE SQL SCHEMA
-- Asisten Akademik Universitas Sapta Mandiri
-- =====================================================
-- Jalankan script ini di Supabase SQL Editor:
-- Dashboard → SQL Editor → New Query → Paste → Run
-- =====================================================

-- ── Enable UUID extension ────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── TABLE: conversations ─────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT    NOT NULL DEFAULT 'Percakapan Baru',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── TABLE: messages ──────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id                UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id   UUID    NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role              TEXT    NOT NULL CHECK (role IN ('user', 'assistant')),
  content           TEXT    NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_conversations_user_id
  ON conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at
  ON conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
  ON messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_created_at
  ON messages(created_at ASC);

-- ── ROW LEVEL SECURITY (RLS) ─────────────────────────
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;

-- ── RLS POLICIES: conversations ──────────────────────
-- Users can only see their own conversations
CREATE POLICY "Users view own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own conversations
CREATE POLICY "Users insert own conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own conversations
CREATE POLICY "Users update own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own conversations
CREATE POLICY "Users delete own conversations"
  ON conversations FOR DELETE
  USING (auth.uid() = user_id);

-- ── RLS POLICIES: messages ────────────────────────────
-- Users can see messages from their own conversations
CREATE POLICY "Users view own messages"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

-- Users can insert messages to their own conversations
CREATE POLICY "Users insert own messages"
  ON messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

-- Users can delete their own messages
CREATE POLICY "Users delete own messages"
  ON messages FOR DELETE
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

-- ── TRIGGER: auto-update updated_at ──────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ── VERIFY ────────────────────────────────────────────
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c2
   WHERE c2.table_name = t.table_name AND c2.table_schema = 'public'
  ) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('conversations', 'messages')
ORDER BY table_name;
