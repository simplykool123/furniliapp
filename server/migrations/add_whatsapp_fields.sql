-- Migration to add WhatsApp support to telegram_user_sessions table
-- This allows the same table to handle both Telegram and WhatsApp users

ALTER TABLE telegram_user_sessions 
  ALTER COLUMN telegram_user_id DROP NOT NULL;

ALTER TABLE telegram_user_sessions 
  ADD COLUMN IF NOT EXISTS whatsapp_user_id TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_username TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_name TEXT;

-- Add constraint to ensure at least one user_id is present
ALTER TABLE telegram_user_sessions 
  ADD CONSTRAINT check_user_id_present 
  CHECK (
    telegram_user_id IS NOT NULL OR 
    whatsapp_user_id IS NOT NULL
  );

-- Add unique constraints for WhatsApp
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_user_unique 
  ON telegram_user_sessions (whatsapp_user_id) 
  WHERE whatsapp_user_id IS NOT NULL;

-- Update existing records to satisfy the new constraint
UPDATE telegram_user_sessions 
SET telegram_user_id = COALESCE(telegram_user_id, 'legacy_' || id::text) 
WHERE telegram_user_id IS NULL;