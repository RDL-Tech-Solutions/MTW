-- =====================================================
-- MTW Promo Database Schema V2 (Unified)
-- Data: 2025-12-29
-- =====================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- 1. CONFIGURAÇÕES GERAIS (APP SETTINGS)
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
    
    -- Expo / Push
    expo_access_token VARCHAR(255),
    
    -- Telegram Collector
    telegram_collector_rate_limit_delay DECIMAL(3,1) DEFAULT 1.0,
    telegram_collector_max_retries INTEGER DEFAULT 3,
    telegram_collector_reconnect_delay INTEGER DEFAULT 30,
    
    -- Backend
    backend_url VARCHAR(500) DEFAULT 'http://localhost:3000',
    backend_api_key VARCHAR(255),
    
    -- AI Settings
    ai_auto_publish_confidence_threshold DECIMAL(3,2) DEFAULT 0.90 CHECK (ai_auto_publish_confidence_threshold >= 0.0 AND ai_auto_publish_confidence_threshold <= 1.0),
    ai_enable_auto_publish BOOLEAN DEFAULT TRUE,
    ai_enable_product_editing BOOLEAN DEFAULT TRUE,
    ai_enable_duplicate_detection BOOLEAN DEFAULT TRUE,
    ai_enable_quality_scoring BOOLEAN DEFAULT TRUE,
    
    -- Outros
    python_path VARCHAR(255) DEFAULT 'python',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT single_settings CHECK (id = '00000000-0000-0000-0000-000000000001')
);

INSERT INTO app_settings (id, amazon_marketplace, backend_url, python_path)
VALUES ('00000000-0000-0000-0000-000000000001', 'www.amazon.com.br', 'http://localhost:3000', 'python')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. USUÁRIOS E AUTENTICAÇÃO
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  push_token VARCHAR(255),
  is_vip BOOLEAN DEFAULT FALSE,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'vip')),
  favorite_categories JSONB DEFAULT '[]'::jsonb,
  favorites JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. CATEGORIAS DE PRODUTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  icon VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. BOT & NOTIFICAÇÕES (BASE)
-- =====================================================
CREATE TABLE IF NOT EXISTS bot_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_enabled BOOLEAN DEFAULT FALSE,
  telegram_bot_token TEXT,
  telegram_bot_username VARCHAR(100),
  telegram_parse_mode VARCHAR(20) DEFAULT 'Markdown',
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

-- Insert bot config default
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
  schedule_start TIME,
  schedule_end TIME,
  min_offer_score DECIMAL(5,2) DEFAULT 0.0,
  avoid_duplicates_hours INTEGER DEFAULT 24,
  
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
  description TEXT,
  available_variables JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. CUPONS E CONFIGURAÇÕES
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
  min_purchase DECIMAL(10,2) DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  is_general BOOLEAN DEFAULT TRUE,
  applicable_products JSONB DEFAULT '[]'::jsonb,
  restrictions TEXT,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  is_vip BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
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
  
  -- AI
  confidence_score DECIMAL(3,2) DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  ai_decision_reason TEXT,
  ai_edit_history JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. PRODUTOS (CORE)
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
  external_id VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  stock_available BOOLEAN DEFAULT TRUE,
  
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

-- =====================================================
-- 7. LOGS E RASTREAMENTO
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(50) NOT NULL,
  platform VARCHAR(20) NOT NULL,
  channel_id UUID REFERENCES bot_channels(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bot_send_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES bot_channels(id) ON DELETE CASCADE,
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('product', 'coupon')),
  entity_id UUID NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(channel_id, entity_type, entity_id)
);

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
-- 8. TRIGGERS & FUNCTIONS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bot_config_updated_at BEFORE UPDATE ON bot_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bot_channels_updated_at BEFORE UPDATE ON bot_channels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bot_templates_updated_at BEFORE UPDATE ON bot_message_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_coupon_settings_updated_at BEFORE UPDATE ON coupon_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. DADOS INICIAIS (SEEDS)
-- =====================================================

-- Categorias
INSERT INTO categories (name, slug, icon) VALUES
  ('Eletrônicos', 'eletronicos', 'smartphone'),
  ('Games', 'games', 'gamepad'),
  ('Casa', 'casa', 'home'),
  ('Acessórios', 'acessorios', 'watch'),
  ('Moda', 'moda', 'shirt'),
  ('Informática', 'informatica', 'laptop'),
  ('Beleza', 'beleza', 'sparkles'),
  ('Esportes', 'esportes', 'dumbbell'),
  ('Livros', 'livros', 'book'),
  ('Brinquedos', 'brinquedos', 'toy-brick')
ON CONFLICT (slug) DO NOTHING;

-- Admin User (Senha: admin123)
INSERT INTO users (name, email, password, role, is_vip) VALUES
  ('Admin', 'admin@mtwpromo.com', '$2a$10$rQ3qZ8qZ8qZ8qZ8qZ8qZ8uK8qZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ', 'admin', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Templates de Mensagem (Simplificado - use o script completo de templates para todos)
INSERT INTO bot_message_templates (template_type, platform, template, description, available_variables) VALUES
('new_promotion', 'all', '🔥 *NOVA OFERTA!* {product_name} - {current_price}', 'Template Padrão', '["product_name"]'::jsonb),
('promotion_with_coupon', 'all', '🔥 *OFERTA + CUPOM!* {product_name} - Cupom: `{coupon_code}`', 'Template Padrão', '["product_name", "coupon_code"]'::jsonb)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 10. POLÍTICAS DE SEGURANÇA (RLS)
-- =====================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_channels ENABLE ROW LEVEL SECURITY;

-- Exemplo simples (expandir conforme necessidade)
CREATE POLICY "Public Read Active Products" ON products FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admin Full Access" ON products FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'));

-- Finalização
SELECT 'Schema V2 Unificado criado com sucesso!' as status;
