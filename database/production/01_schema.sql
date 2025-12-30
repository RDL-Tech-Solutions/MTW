-- =====================================================
-- MTW Promo Database Schema V3 (Complete)
-- Data: 2025-12-29
-- =====================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- 1. CONFIGURAÇÕES GERAIS (APP_SETTINGS)
-- =====================================================
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Mercado Livre
    meli_client_id VARCHAR(255),
    meli_client_secret VARCHAR(255),
    meli_access_token TEXT,
    meli_refresh_token TEXT,
    meli_redirect_uri VARCHAR(500),
    meli_affiliate_code VARCHAR(100),
    meli_affiliate_tag VARCHAR(100),
    meli_user_id VARCHAR(100),
    
    -- Shopee
    shopee_partner_id VARCHAR(100),
    shopee_partner_key VARCHAR(255),
    
    -- Amazon
    amazon_access_key VARCHAR(255),
    amazon_secret_key VARCHAR(255),
    amazon_partner_tag VARCHAR(100),
    amazon_marketplace VARCHAR(50) DEFAULT 'www.amazon.com.br',
    
    -- AliExpress
    aliexpress_api_url VARCHAR(500) DEFAULT 'https://api-sg.aliexpress.com/rest',
    aliexpress_app_key VARCHAR(255),
    aliexpress_app_secret TEXT,
    aliexpress_tracking_id VARCHAR(255),
    aliexpress_product_origin VARCHAR(20) DEFAULT 'both' CHECK (aliexpress_product_origin IN ('portal', 'local', 'both')),
    
    -- OpenRouter / AI
    openrouter_api_key VARCHAR(255),
    openrouter_model VARCHAR(100) DEFAULT 'openai/gpt-4o-mini',
    openrouter_enabled BOOLEAN DEFAULT FALSE,
    
    -- AI Settings
    ai_auto_publish_confidence_threshold DECIMAL(3,2) DEFAULT 0.90 CHECK (ai_auto_publish_confidence_threshold >= 0.0 AND ai_auto_publish_confidence_threshold <= 1.0),
    ai_enable_auto_publish BOOLEAN DEFAULT TRUE,
    ai_enable_product_editing BOOLEAN DEFAULT TRUE,
    ai_enable_duplicate_detection BOOLEAN DEFAULT TRUE,
    ai_enable_quality_scoring BOOLEAN DEFAULT TRUE,
    
    -- Expo / Push
    expo_access_token VARCHAR(255),
    
    -- Telegram Collector
    telegram_api_id VARCHAR(100),
    telegram_api_hash VARCHAR(255),
    telegram_phone_number VARCHAR(50),
    telegram_session_string TEXT,
    telegram_phone_code_hash VARCHAR(255),
    telegram_last_code_sent_at TIMESTAMP WITH TIME ZONE,
    telegram_collector_rate_limit_delay DECIMAL(3,1) DEFAULT 1.0,
    telegram_collector_max_retries INTEGER DEFAULT 3,
    telegram_collector_reconnect_delay INTEGER DEFAULT 30,
    
    -- Backend
    backend_url VARCHAR(500) DEFAULT 'http://localhost:3000',
    backend_api_key VARCHAR(255),
    
    -- Template Mode
    use_system_templates BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT single_settings CHECK (id = '00000000-0000-0000-0000-000000000001')
);

INSERT INTO app_settings (id, amazon_marketplace, backend_url)
VALUES ('00000000-0000-0000-0000-000000000001', 'www.amazon.com.br', 'http://localhost:3000')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. USUÁRIOS E AUTENTICAÇÃO
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  push_token VARCHAR(255),
  is_vip BOOLEAN DEFAULT FALSE,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'vip')),
  favorite_categories JSONB DEFAULT '[]'::jsonb,
  favorites JSONB DEFAULT '[]'::jsonb,
  
  -- Social Auth
  provider TEXT,
  provider_id TEXT,
  avatar_url TEXT,
  
  -- Preferences
  theme VARCHAR(20) DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  dark_mode BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_provider_id ON users(provider, provider_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Tabelas de Preferências do Usuário
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Preferências gerais
  push_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT FALSE,
  
  -- Preferências por categoria/palavra/produto
  category_preferences JSONB DEFAULT '[]'::jsonb,
  keyword_preferences JSONB DEFAULT '[]'::jsonb,
  product_name_preferences JSONB DEFAULT '[]'::jsonb,
  
  -- Filtros de tela inicial
  home_filters JSONB DEFAULT '{
    "platforms": [],
    "categories": [],
    "min_discount": 0,
    "max_price": null,
    "only_with_coupon": false
  }'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- =====================================================
-- 3. CATEGORIAS DE PRODUTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  icon VARCHAR(50) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- =====================================================
-- 4. BOT & NOTIFICAÇÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS bot_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_enabled BOOLEAN DEFAULT FALSE,
  telegram_bot_token TEXT,
  telegram_bot_username VARCHAR(100),
  telegram_parse_mode VARCHAR(20) DEFAULT 'HTML',
  telegram_disable_preview BOOLEAN DEFAULT FALSE,
  whatsapp_enabled BOOLEAN DEFAULT FALSE,
  whatsapp_api_url TEXT,
  whatsapp_api_token TEXT,
  whatsapp_phone_number_id VARCHAR(100),
  whatsapp_business_account_id VARCHAR(100),
  notify_new_products BOOLEAN DEFAULT TRUE,
  notify_new_coupons BOOLEAN DEFAULT TRUE,
  notify_expired_coupons BOOLEAN DEFAULT FALSE,
  notify_price_drops BOOLEAN DEFAULT TRUE,
  min_discount_to_notify INTEGER DEFAULT 20,
  message_template_product TEXT,
  message_template_coupon TEXT,
  rate_limit_per_minute INTEGER DEFAULT 20,
  delay_between_messages INTEGER DEFAULT 500,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO bot_config (id) SELECT uuid_generate_v4() WHERE NOT EXISTS (SELECT 1 FROM bot_config);

CREATE TABLE IF NOT EXISTS bot_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('whatsapp', 'telegram')),
  identifier VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Segmentação
  category_filter JSONB DEFAULT '[]'::jsonb,
  platform_filter JSONB DEFAULT '[]'::jsonb,
  content_filter JSONB DEFAULT '{"products": true, "coupons": true}'::jsonb,
  schedule_start TIME,
  schedule_end TIME,
  min_offer_score DECIMAL(5,2) DEFAULT 0.0,
  avoid_duplicates_hours INTEGER DEFAULT 24,
  max_notifications_per_day INTEGER DEFAULT 0,
  content_filter_keywords TEXT,
  exclude_keywords TEXT,
  min_discount_percentage_filter INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(platform, identifier)
);

CREATE TABLE IF NOT EXISTS bot_message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('new_promotion', 'promotion_with_coupon', 'new_coupon', 'expired_coupon')),
  platform VARCHAR(20) DEFAULT 'all' CHECK (platform IN ('telegram', 'whatsapp', 'all')),
  template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_system BOOLEAN DEFAULT FALSE,
  description TEXT,
  available_variables JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. TELEGRAM CHANNELS (Captura)
-- =====================================================
CREATE TABLE IF NOT EXISTS telegram_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  username VARCHAR(255),
  channel_id VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  coupons_captured INTEGER DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_message_id BIGINT,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  
  -- Configurações de captura
  capture_schedule_start TIME,
  capture_schedule_end TIME,
  capture_mode VARCHAR(20) DEFAULT 'new_only',
  platform_filter VARCHAR(50) DEFAULT 'all',
  example_messages TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_channels_username ON telegram_channels(username);
CREATE INDEX IF NOT EXISTS idx_telegram_channels_channel_id ON telegram_channels(channel_id);
CREATE INDEX IF NOT EXISTS idx_telegram_channels_active ON telegram_channels(is_active);

-- Configurações de Coletor
CREATE TABLE IF NOT EXISTS telegram_collector_config (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    api_id VARCHAR(50),
    api_hash VARCHAR(100),
    phone VARCHAR(30),
    password VARCHAR(100),
    session_path VARCHAR(255) DEFAULT 'telegram_session.session',
    is_authenticated BOOLEAN DEFAULT FALSE,
    listener_status VARCHAR(20) DEFAULT 'stopped' CHECK (listener_status IN ('running', 'stopped', 'error')),
    listener_pid INTEGER,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT single_collector_config CHECK (id = '00000000-0000-0000-0000-000000000001')
);

INSERT INTO telegram_collector_config (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 6. CUPONS E CONFIGURAÇÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS coupon_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auto_capture_enabled BOOLEAN DEFAULT TRUE,
  capture_interval_minutes INTEGER DEFAULT 10,
  shopee_enabled BOOLEAN DEFAULT TRUE,
  shopee_partner_id VARCHAR(255),
  shopee_partner_key TEXT,
  meli_enabled BOOLEAN DEFAULT TRUE,
  meli_capture_deals BOOLEAN DEFAULT TRUE,
  meli_capture_campaigns BOOLEAN DEFAULT TRUE,
  meli_capture_seller_promotions BOOLEAN DEFAULT TRUE,
  amazon_enabled BOOLEAN DEFAULT FALSE,
  amazon_partner_tag VARCHAR(255),
  amazon_access_key VARCHAR(255),
  amazon_secret_key TEXT,
  aliexpress_enabled BOOLEAN DEFAULT FALSE,
  aliexpress_app_key VARCHAR(255),
  aliexpress_app_secret TEXT,
  aliexpress_tracking_id VARCHAR(255),
  gatry_enabled BOOLEAN DEFAULT FALSE,
  notify_bots_on_new_coupon BOOLEAN DEFAULT TRUE,
  notify_bots_on_expiration BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO coupon_settings (id) VALUES ('00000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(100) NOT NULL,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('shopee', 'mercadolivre', 'amazon', 'aliexpress', 'general')),
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  max_discount DECIMAL(10,2),
  min_purchase DECIMAL(10,2) DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_until TIMESTAMP WITH TIME ZONE,
  is_general BOOLEAN DEFAULT TRUE,
  applicable_products JSONB DEFAULT '[]'::jsonb,
  restrictions TEXT,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  is_vip BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  is_exclusive BOOLEAN DEFAULT FALSE,
  is_out_of_stock BOOLEAN DEFAULT FALSE,
  is_pending_approval BOOLEAN DEFAULT FALSE,
  
  -- Campos extendidos
  title VARCHAR(500),
  description TEXT,
  affiliate_link TEXT,
  campaign_id VARCHAR(255),
  campaign_name VARCHAR(500),
  terms_and_conditions TEXT,
  auto_captured BOOLEAN DEFAULT FALSE,
  source_url TEXT,
  last_verified_at TIMESTAMP WITH TIME ZONE,
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'active', 'expired', 'invalid')),
  
  -- Origem / Telegram
  origem VARCHAR(50),
  capture_source VARCHAR(50),
  channel_origin VARCHAR(255),
  message_id VARCHAR(100),
  message_hash VARCHAR(64),
  
  -- AI
  confidence_score DECIMAL(3,2) DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  ai_decision_reason TEXT,
  ai_edit_history JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_platform ON coupons(platform);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_pending ON coupons(is_pending_approval);
CREATE INDEX IF NOT EXISTS idx_coupons_origem ON coupons(origem);
CREATE INDEX IF NOT EXISTS idx_coupons_message_hash ON coupons(message_hash);
CREATE INDEX IF NOT EXISTS idx_coupons_confidence_score ON coupons(confidence_score);

-- Comentários em colunas de cupons
COMMENT ON COLUMN coupons.is_out_of_stock IS 'Indica se os produtos vinculados ao cupom estão esgotados';
COMMENT ON COLUMN coupons.auto_captured IS 'Indica se o cupom foi capturado automaticamente';
COMMENT ON COLUMN coupons.verification_status IS 'Status da verificação do cupom';

-- =====================================================
-- 7. PRODUTOS (CORE)
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(500) NOT NULL,
  image_url TEXT NOT NULL,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('shopee', 'mercadolivre', 'amazon', 'aliexpress', 'unknown')),
  current_price DECIMAL(10,2) NOT NULL,
  old_price DECIMAL(10,2),
  discount_percentage INTEGER,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  affiliate_link TEXT NOT NULL,
  original_link TEXT,
  external_id VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  stock_available BOOLEAN DEFAULT TRUE,
  status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('pending', 'approved', 'published', 'rejected')),
  
  -- AI & Quality
  offer_score DECIMAL(5,2) DEFAULT 0.0 CHECK (offer_score >= 0.0 AND offer_score <= 100.0),
  canonical_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  offer_priority VARCHAR(10) DEFAULT 'medium' CHECK (offer_priority IN ('low', 'medium', 'high')),
  ai_optimized_title VARCHAR(500),
  ai_generated_description TEXT,
  ai_detected_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  ai_decision_reason TEXT,
  ai_edit_history JSONB DEFAULT '[]'::jsonb,
  should_send_push BOOLEAN DEFAULT FALSE,
  should_send_to_bots BOOLEAN DEFAULT TRUE,
  is_featured_offer BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_platform ON products(platform);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_external_id ON products(external_id);
CREATE INDEX IF NOT EXISTS idx_products_offer_score ON products(offer_score);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured_offer, status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

CREATE TABLE IF NOT EXISTS product_duplicates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canonical_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  duplicate_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  similarity_score DECIMAL(5,2) DEFAULT 0.0 CHECK (similarity_score >= 0.0 AND similarity_score <= 100.0),
  detection_method VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(canonical_product_id, duplicate_product_id)
);

CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_recorded ON price_history(recorded_at);

-- =====================================================
-- 8. SINCRONIZAÇÃO AUTOMÁTICA
-- =====================================================
CREATE TABLE IF NOT EXISTS sync_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopee_enabled BOOLEAN DEFAULT FALSE,
  mercadolivre_enabled BOOLEAN DEFAULT FALSE,
  amazon_enabled BOOLEAN DEFAULT FALSE,
  aliexpress_enabled BOOLEAN DEFAULT FALSE,
  keywords TEXT DEFAULT '',
  min_discount_percentage INTEGER DEFAULT 10,
  categories JSONB DEFAULT '[]'::jsonb,
  cron_interval_minutes INTEGER DEFAULT 60,
  auto_publish BOOLEAN DEFAULT FALSE,
  shopee_auto_publish BOOLEAN DEFAULT FALSE,
  mercadolivre_auto_publish BOOLEAN DEFAULT FALSE,
  amazon_auto_publish BOOLEAN DEFAULT FALSE,
  aliexpress_auto_publish BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO sync_config (id) 
SELECT '00000000-0000-0000-0000-000000000002' 
WHERE NOT EXISTS (SELECT 1 FROM sync_config LIMIT 1);

-- Comentários nas colunas de auto-publicação (Migration 044)
COMMENT ON COLUMN sync_config.shopee_auto_publish IS 'Publicar automaticamente produtos da Shopee após análise estratégica da IA';
COMMENT ON COLUMN sync_config.mercadolivre_auto_publish IS 'Publicar automaticamente produtos do Mercado Livre após análise estratégica da IA';
COMMENT ON COLUMN sync_config.amazon_auto_publish IS 'Publicar automaticamente produtos da Amazon após análise estratégica da IA';
COMMENT ON COLUMN sync_config.aliexpress_auto_publish IS 'Publicar automaticamente produtos do AliExpress após análise estratégica da IA';

CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('shopee', 'mercadolivre', 'amazon', 'aliexpress')),
  product_name VARCHAR(500),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  discount_percentage INTEGER,
  is_new_product BOOLEAN DEFAULT TRUE,
  sent_to_bots BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_platform ON sync_logs(platform);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_product_id ON sync_logs(product_id);

-- =====================================================
-- 9. LOGS E RASTREAMENTO
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(50) NOT NULL,
  platform VARCHAR(20) NOT NULL,
  channel_id UUID REFERENCES bot_channels(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  success BOOLEAN DEFAULT TRUE,
  channel_name VARCHAR(255),
  message_id VARCHAR(255),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_channel ON notification_logs(channel_id);

CREATE TABLE IF NOT EXISTS bot_send_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES bot_channels(id) ON DELETE CASCADE,
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('product', 'coupon')),
  entity_id UUID NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(channel_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_bot_send_logs_channel ON bot_send_logs(channel_id);
CREATE INDEX IF NOT EXISTS idx_bot_send_logs_sent_at ON bot_send_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_bot_send_logs_entity ON bot_send_logs(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS ai_decision_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('coupon', 'product')),
  entity_id UUID NOT NULL,
  decision_type VARCHAR(50) NOT NULL,
  confidence_score DECIMAL(3,2),
  decision_reason TEXT,
  input_data JSONB,
  output_data JSONB,
  model_used VARCHAR(100),
  processing_time_ms INTEGER,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_entity ON ai_decision_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_decision_logs(created_at);

CREATE TABLE IF NOT EXISTS click_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  converted BOOLEAN DEFAULT FALSE,
  conversion_date TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS coupon_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform VARCHAR(20) NOT NULL,
  sync_type VARCHAR(50) NOT NULL,
  coupons_found INTEGER DEFAULT 0,
  coupons_created INTEGER DEFAULT 0,
  coupons_updated INTEGER DEFAULT 0,
  coupons_expired INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  error_details TEXT,
  duration_ms INTEGER,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'running',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  related_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  related_coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  is_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 10. TRIGGERS & FUNCTIONS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  -- Drop existing triggers first to avoid conflicts
  DROP TRIGGER IF EXISTS update_users_updated_at ON users;
  DROP TRIGGER IF EXISTS update_products_updated_at ON products;
  DROP TRIGGER IF EXISTS update_coupons_updated_at ON coupons;
  DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
  DROP TRIGGER IF EXISTS update_bot_config_updated_at ON bot_config;
  DROP TRIGGER IF EXISTS update_bot_channels_updated_at ON bot_channels;
  DROP TRIGGER IF EXISTS update_bot_templates_updated_at ON bot_message_templates;
  DROP TRIGGER IF EXISTS update_coupon_settings_updated_at ON coupon_settings;
  DROP TRIGGER IF EXISTS update_sync_config_updated_at ON sync_config;
  DROP TRIGGER IF EXISTS update_telegram_channels_updated_at ON telegram_channels;

  -- Create triggers
  CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  CREATE TRIGGER update_bot_config_updated_at BEFORE UPDATE ON bot_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  CREATE TRIGGER update_bot_channels_updated_at BEFORE UPDATE ON bot_channels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  CREATE TRIGGER update_bot_templates_updated_at BEFORE UPDATE ON bot_message_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  CREATE TRIGGER update_coupon_settings_updated_at BEFORE UPDATE ON coupon_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  CREATE TRIGGER update_sync_config_updated_at BEFORE UPDATE ON sync_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  CREATE TRIGGER update_telegram_channels_updated_at BEFORE UPDATE ON telegram_channels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  CREATE TRIGGER update_telegram_collector_config_updated_at BEFORE UPDATE ON telegram_collector_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

-- =====================================================
-- 10.1 FUNÇÕES DE MANUTENÇÃO
-- =====================================================

-- Função para limpar logs antigos de envio dos bots (manter 30 dias)
CREATE OR REPLACE FUNCTION cleanup_old_bot_send_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM bot_send_logs
  WHERE sent_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

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

-- =====================================================
-- 11. VIEWS
-- =====================================================
-- View de Cupons Ativos
CREATE OR REPLACE VIEW active_coupons AS
SELECT *
FROM coupons
WHERE is_active = TRUE
  AND verification_status = 'active'
  AND (valid_until IS NULL OR valid_until > NOW())
  AND (max_uses IS NULL OR current_uses < max_uses);

-- View de Estatísticas de Produtos (Dashboard)
CREATE OR REPLACE VIEW product_stats AS
SELECT 
    platform,
    status,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE is_active = TRUE) as active_count,
    ROUND(AVG(discount_percentage), 2) as avg_discount,
    MAX(created_at) as last_added_at
FROM products
GROUP BY platform, status;

CREATE OR REPLACE VIEW products_full AS
SELECT 
    p.*,
    c.name as category_name,
    c.slug as category_slug,
    c.icon as category_icon,
    cp.code as coupon_code,
    cp.discount_type as coupon_discount_type,
    cp.discount_value as coupon_discount_value,
    cp.valid_until as coupon_valid_until,
    cp.is_vip as coupon_is_vip
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN coupons cp ON p.coupon_id = cp.id;

-- Permissões para views
GRANT SELECT ON active_coupons TO anon, authenticated, service_role;
GRANT SELECT ON product_stats TO anon, authenticated, service_role;
GRANT SELECT ON products_full TO anon, authenticated, service_role;

-- =====================================================
-- 12. DADOS INICIAIS (SEEDS)
-- =====================================================

-- Categorias
INSERT INTO categories (name, slug, icon, description, is_active) VALUES
  ('Acessórios', 'acessorios', '⌚', 'Acessórios diversos', true),
  ('Beleza', 'beleza', '💄', 'Produtos de beleza e cuidados pessoais', true),
  ('Brinquedos', 'brinquedos', '🧸', 'Brinquedos e jogos infantis', true),
  ('Casa', 'casa', '🏠', 'Produtos para casa e decoração', true),
  ('Eletrônicos', 'eletronicos', '📱', 'Eletrônicos e gadgets', true),
  ('Esporte', 'esporte', '⚽', 'Artigos esportivos', true),
  ('Games', 'games', '🎮', 'Jogos e consoles', true),
  ('Informática', 'informatica', '💻', 'Computadores e periféricos', true),
  ('Livros', 'livros', '📚', 'Livros e materiais de leitura', true),
  ('Moda', 'moda', '👕', 'Roupas e acessórios de moda', true)
ON CONFLICT (slug) DO UPDATE
SET 
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- Admin User (Senha: admin123 - $2b$10$hash)
INSERT INTO users (name, email, password, role, is_vip) VALUES
  ('Admin', 'admin@mtwpromo.com', '$2b$10$rQ3qZ8qZ8qZ8qZ8qZ8qZ8uK8qZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ', 'admin', TRUE)
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- 13. POLÍTICAS DE SEGURANÇA (RLS)
-- =====================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_collector_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_config ENABLE ROW LEVEL SECURITY;

-- Políticas básicas
DROP POLICY IF EXISTS "Public Read Active Products" ON products;
DROP POLICY IF EXISTS "Admin Full Access" ON products;
CREATE POLICY "Public Read Active Products" ON products FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admin Full Access" ON products FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'));

-- Políticas para outras tabelas (Admin Only)
CREATE POLICY "Admin Full Access Sync" ON sync_config FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'));
CREATE POLICY "Admin Full Access Telegram Config" ON telegram_collector_config FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'));
CREATE POLICY "User Manage Own Preferences" ON notification_preferences FOR ALL USING (user_id::text = auth.uid()::text);

-- Finalização
SELECT 'Schema V3 Completo criado com sucesso!' as status;
