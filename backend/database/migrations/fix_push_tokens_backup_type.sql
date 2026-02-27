-- Correção: Alterar tipo da coluna user_id de INTEGER para UUID
-- Data: 2026-02-27
-- Descrição: Corrige incompatibilidade de tipos na tabela push_tokens_backup

-- Dropar a tabela existente se tiver dados incompatíveis
DROP TABLE IF EXISTS push_tokens_backup CASCADE;

-- Recriar a tabela com os tipos corretos
CREATE TABLE push_tokens_backup (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  backed_up_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  restored BOOLEAN DEFAULT FALSE,
  restored_at TIMESTAMP WITH TIME ZONE
);

-- Recriar índices
CREATE INDEX idx_push_tokens_backup_user_id ON push_tokens_backup(user_id);
CREATE INDEX idx_push_tokens_backup_restored ON push_tokens_backup(restored) WHERE restored = FALSE;

-- Recriar comentários
COMMENT ON TABLE push_tokens_backup IS 'Backup dos tokens Expo para rollback em caso de problemas';
COMMENT ON COLUMN push_tokens_backup.id IS 'ID único do backup (UUID)';
COMMENT ON COLUMN push_tokens_backup.user_id IS 'ID do usuário (UUID)';
COMMENT ON COLUMN push_tokens_backup.push_token IS 'Token Expo original';
COMMENT ON COLUMN push_tokens_backup.backed_up_at IS 'Data e hora do backup';
COMMENT ON COLUMN push_tokens_backup.restored IS 'Se o token foi restaurado (rollback)';
COMMENT ON COLUMN push_tokens_backup.restored_at IS 'Data e hora da restauração';

-- Recriar função de backup
CREATE OR REPLACE FUNCTION backup_push_token()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o push_token está sendo removido e era um token Expo, fazer backup
  IF OLD.push_token IS NOT NULL 
     AND NEW.push_token IS NULL 
     AND (OLD.push_token LIKE 'ExponentPushToken%' OR OLD.push_token LIKE 'ExpoPushToken%')
     AND OLD.onesignal_migrated = TRUE THEN
    
    INSERT INTO push_tokens_backup (user_id, push_token)
    VALUES (OLD.id, OLD.push_token)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar trigger
DROP TRIGGER IF EXISTS trigger_backup_push_token ON users;
CREATE TRIGGER trigger_backup_push_token
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION backup_push_token();

-- Log
DO $$
BEGIN
  RAISE NOTICE '✅ Correção aplicada com sucesso';
  RAISE NOTICE '   - Tabela push_tokens_backup recriada com UUID';
  RAISE NOTICE '   - Índices recriados';
  RAISE NOTICE '   - Função e trigger recriados';
END $$;
