-- =====================================================
-- Migration: Aprimorar tabela de cupons para captura automática
-- Data: 2024-12-12
-- Descrição: Adiciona campos necessários para o módulo de captura automática
-- =====================================================

-- Adicionar novos campos à tabela coupons
ALTER TABLE coupons
ADD COLUMN IF NOT EXISTS title VARCHAR(500),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS affiliate_link TEXT,
ADD COLUMN IF NOT EXISTS campaign_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS campaign_name VARCHAR(500),
ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT,
ADD COLUMN IF NOT EXISTS auto_captured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending' 
  CHECK (verification_status IN ('pending', 'active', 'expired', 'invalid'));

-- Atualizar constraint de platform para incluir novas plataformas
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_platform_check;
ALTER TABLE coupons
ADD CONSTRAINT coupons_platform_check 
CHECK (platform IN ('shopee', 'mercadolivre', 'amazon', 'aliexpress', 'general'));

-- Criar índices para os novos campos
CREATE INDEX IF NOT EXISTS idx_coupons_campaign_id ON coupons(campaign_id);
CREATE INDEX IF NOT EXISTS idx_coupons_auto_captured ON coupons(auto_captured);
CREATE INDEX IF NOT EXISTS idx_coupons_verification_status ON coupons(verification_status);
CREATE INDEX IF NOT EXISTS idx_coupons_last_verified_at ON coupons(last_verified_at);

-- =====================================================
-- TABELA: coupon_sync_logs
-- =====================================================
CREATE TABLE IF NOT EXISTS coupon_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform VARCHAR(20) NOT NULL,
  sync_type VARCHAR(50) NOT NULL CHECK (sync_type IN ('capture', 'verification', 'expiration_check')),
  coupons_found INTEGER DEFAULT 0,
  coupons_created INTEGER DEFAULT 0,
  coupons_updated INTEGER DEFAULT 0,
  coupons_expired INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  error_details TEXT,
  duration_ms INTEGER,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para coupon_sync_logs
CREATE INDEX idx_coupon_sync_logs_platform ON coupon_sync_logs(platform);
CREATE INDEX idx_coupon_sync_logs_sync_type ON coupon_sync_logs(sync_type);
CREATE INDEX idx_coupon_sync_logs_status ON coupon_sync_logs(status);
CREATE INDEX idx_coupon_sync_logs_started_at ON coupon_sync_logs(started_at);

-- =====================================================
-- TABELA: coupon_settings
-- =====================================================
CREATE TABLE IF NOT EXISTS coupon_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auto_capture_enabled BOOLEAN DEFAULT TRUE,
  capture_interval_minutes INTEGER DEFAULT 10,
  
  -- Shopee settings
  shopee_enabled BOOLEAN DEFAULT TRUE,
  shopee_partner_id VARCHAR(255),
  shopee_partner_key TEXT,
  
  -- Mercado Livre settings
  meli_enabled BOOLEAN DEFAULT TRUE,
  meli_capture_deals BOOLEAN DEFAULT TRUE,
  meli_capture_campaigns BOOLEAN DEFAULT TRUE,
  
  -- Amazon settings
  amazon_enabled BOOLEAN DEFAULT FALSE,
  amazon_partner_tag VARCHAR(255),
  amazon_access_key VARCHAR(255),
  amazon_secret_key TEXT,
  
  -- AliExpress settings
  aliexpress_enabled BOOLEAN DEFAULT FALSE,
  aliexpress_app_key VARCHAR(255),
  aliexpress_app_secret TEXT,
  aliexpress_tracking_id VARCHAR(255),
  
  -- Notification settings
  notify_bots_on_new_coupon BOOLEAN DEFAULT TRUE,
  notify_bots_on_expiration BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir configuração padrão
INSERT INTO coupon_settings (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_coupon_settings_updated_at 
BEFORE UPDATE ON coupon_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Atualizar view de cupons ativos
-- =====================================================
CREATE OR REPLACE VIEW active_coupons AS
SELECT *
FROM coupons
WHERE is_active = TRUE
  AND verification_status = 'active'
  AND valid_until > NOW()
  AND (max_uses IS NULL OR current_uses < max_uses);

-- =====================================================
-- Funções utilitárias
-- =====================================================

-- Função para marcar cupons expirados automaticamente
CREATE OR REPLACE FUNCTION mark_expired_coupons()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE coupons
  SET 
    is_active = FALSE,
    verification_status = 'expired',
    updated_at = NOW()
  WHERE is_active = TRUE
    AND valid_until < NOW()
    AND verification_status != 'expired';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON TABLE coupon_sync_logs IS 'Logs de sincronização automática de cupons';
COMMENT ON TABLE coupon_settings IS 'Configurações globais do módulo de captura de cupons';
COMMENT ON COLUMN coupons.auto_captured IS 'Indica se o cupom foi capturado automaticamente';
COMMENT ON COLUMN coupons.verification_status IS 'Status da verificação do cupom';

-- Verificar se a migration foi aplicada com sucesso
SELECT 'Migration 002 aplicada com sucesso!' as status;
