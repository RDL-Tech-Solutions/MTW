-- Migração: Adicionar suporte ao OneSignal
-- Data: 2026-02-27
-- Descrição: Adiciona colunas para gerenciar a migração do Expo Notifications para OneSignal

-- Adicionar colunas na tabela users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS onesignal_player_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS onesignal_migrated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onesignal_migrated_at TIMESTAMP WITH TIME ZONE;

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_onesignal_player_id ON users(onesignal_player_id);
CREATE INDEX IF NOT EXISTS idx_users_onesignal_migrated ON users(onesignal_migrated) WHERE onesignal_migrated = TRUE;

-- Adicionar colunas na tabela app_settings
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS onesignal_app_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS onesignal_rest_api_key VARCHAR(500),
ADD COLUMN IF NOT EXISTS onesignal_enabled BOOLEAN DEFAULT TRUE;

-- Comentários
COMMENT ON COLUMN users.onesignal_player_id IS 'ID do player no OneSignal (device ID)';
COMMENT ON COLUMN users.onesignal_migrated IS 'Indica se o usuário foi migrado para OneSignal';
COMMENT ON COLUMN users.onesignal_migrated_at IS 'Data e hora da migração para OneSignal';

COMMENT ON COLUMN app_settings.onesignal_app_id IS 'App ID do OneSignal';
COMMENT ON COLUMN app_settings.onesignal_rest_api_key IS 'REST API Key do OneSignal';
COMMENT ON COLUMN app_settings.onesignal_enabled IS 'Se o OneSignal está habilitado (feature flag)';

-- Criar tabela de backup dos tokens Expo (opcional, para rollback)
CREATE TABLE IF NOT EXISTS push_tokens_backup (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  backed_up_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  restored BOOLEAN DEFAULT FALSE,
  restored_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_backup_user_id ON push_tokens_backup(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_backup_restored ON push_tokens_backup(restored) WHERE restored = FALSE;

COMMENT ON TABLE push_tokens_backup IS 'Backup dos tokens Expo para rollback em caso de problemas';
COMMENT ON COLUMN push_tokens_backup.user_id IS 'ID do usuário';
COMMENT ON COLUMN push_tokens_backup.push_token IS 'Token Expo original';
COMMENT ON COLUMN push_tokens_backup.backed_up_at IS 'Data e hora do backup';
COMMENT ON COLUMN push_tokens_backup.restored IS 'Se o token foi restaurado (rollback)';
COMMENT ON COLUMN push_tokens_backup.restored_at IS 'Data e hora da restauração';

-- Criar função para fazer backup automático antes de limpar tokens
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

-- Criar trigger para backup automático
DROP TRIGGER IF EXISTS trigger_backup_push_token ON users;
CREATE TRIGGER trigger_backup_push_token
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION backup_push_token();

COMMENT ON FUNCTION backup_push_token() IS 'Faz backup automático dos tokens Expo antes de serem removidos';
COMMENT ON TRIGGER trigger_backup_push_token ON users IS 'Trigger para backup automático de tokens Expo';

-- Log de migração
DO $$
BEGIN
  RAISE NOTICE '✅ Migração OneSignal aplicada com sucesso';
  RAISE NOTICE '   - Colunas adicionadas na tabela users';
  RAISE NOTICE '   - Colunas adicionadas na tabela app_settings';
  RAISE NOTICE '   - Tabela push_tokens_backup criada';
  RAISE NOTICE '   - Índices criados';
  RAISE NOTICE '   - Trigger de backup configurado';
END $$;
