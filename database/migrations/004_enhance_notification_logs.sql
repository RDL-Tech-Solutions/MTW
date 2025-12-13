-- =====================================================
-- ENHANCEMENT: notification_logs
-- Adicionar colunas extras para melhor tracking
-- =====================================================

-- Adicionar coluna channel_name se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'notification_logs' 
                 AND column_name = 'channel_name') THEN
    ALTER TABLE notification_logs ADD COLUMN channel_name VARCHAR(255);
  END IF;
END $$;

-- Adicionar coluna success se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'notification_logs' 
                 AND column_name = 'success') THEN
    ALTER TABLE notification_logs ADD COLUMN success BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Adicionar coluna message_id se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'notification_logs' 
                 AND column_name = 'message_id') THEN
    ALTER TABLE notification_logs ADD COLUMN message_id VARCHAR(255);
  END IF;
END $$;

-- Atualizar success baseado em status existente
UPDATE notification_logs 
SET success = CASE 
  WHEN status = 'sent' THEN TRUE
  WHEN status = 'failed' THEN FALSE
  ELSE NULL
END
WHERE success IS NULL;

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
SELECT 'Migration 004_enhance_notification_logs executada com sucesso!' as status;

