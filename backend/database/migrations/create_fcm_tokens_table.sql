-- =====================================================
-- Migração: Criar tabela fcm_tokens
-- Data: 2026-03-03
-- Descrição: Cria tabela para armazenar tokens FCM por dispositivo
--            Permite múltiplos dispositivos por usuário
-- =====================================================

-- Criar tabela fcm_tokens
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  platform VARCHAR(20) CHECK (platform IN ('android', 'ios', 'web')),
  device_id TEXT,
  device_name TEXT,
  app_version TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Garantir que não haja tokens duplicados
  UNIQUE(fcm_token)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_platform ON fcm_tokens(platform);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_device_id ON fcm_tokens(device_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_last_used ON fcm_tokens(last_used_at);

-- Comentários
COMMENT ON TABLE fcm_tokens IS 'Tokens FCM (Firebase Cloud Messaging) por dispositivo';
COMMENT ON COLUMN fcm_tokens.id IS 'ID único do token';
COMMENT ON COLUMN fcm_tokens.user_id IS 'ID do usuário dono do dispositivo';
COMMENT ON COLUMN fcm_tokens.fcm_token IS 'Token FCM do dispositivo';
COMMENT ON COLUMN fcm_tokens.platform IS 'Plataforma do dispositivo (android, ios, web)';
COMMENT ON COLUMN fcm_tokens.device_id IS 'ID único do dispositivo';
COMMENT ON COLUMN fcm_tokens.device_name IS 'Nome do dispositivo (ex: Samsung Galaxy S21)';
COMMENT ON COLUMN fcm_tokens.app_version IS 'Versão do app instalada';
COMMENT ON COLUMN fcm_tokens.created_at IS 'Data de criação do registro';
COMMENT ON COLUMN fcm_tokens.updated_at IS 'Data da última atualização';
COMMENT ON COLUMN fcm_tokens.last_used_at IS 'Data do último uso (envio de notificação)';

-- Migrar tokens existentes da tabela users (se houver)
INSERT INTO fcm_tokens (user_id, fcm_token, platform, created_at)
SELECT 
  id as user_id,
  push_token as fcm_token,
  'android' as platform, -- Assumir android por padrão
  created_at
FROM users
WHERE push_token IS NOT NULL 
  AND push_token != ''
  AND LENGTH(push_token) > 20 -- Validar que é um token válido
ON CONFLICT (fcm_token) DO NOTHING;

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_fcm_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_fcm_tokens_updated_at ON fcm_tokens;
CREATE TRIGGER trigger_update_fcm_tokens_updated_at
  BEFORE UPDATE ON fcm_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_fcm_tokens_updated_at();

-- Função para limpar tokens antigos (não usados há mais de 90 dias)
CREATE OR REPLACE FUNCTION cleanup_old_fcm_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM fcm_tokens
  WHERE last_used_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Limpeza de tokens FCM: % tokens removidos', deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comentário na função
COMMENT ON FUNCTION cleanup_old_fcm_tokens() IS 'Remove tokens FCM não usados há mais de 90 dias';

-- Log de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Tabela fcm_tokens criada com sucesso';
  RAISE NOTICE '   - Índices criados';
  RAISE NOTICE '   - Triggers configurados';
  RAISE NOTICE '   - Tokens existentes migrados de users.push_token';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Próximos passos:';
  RAISE NOTICE '   1. App deve registrar tokens via POST /api/fcm/register';
  RAISE NOTICE '   2. Backend enviará notificações via fcmService';
  RAISE NOTICE '   3. Execute periodicamente: SELECT cleanup_old_fcm_tokens();';
END $$;
