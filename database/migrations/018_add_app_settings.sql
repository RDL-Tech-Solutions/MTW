-- Migration: Adicionar tabela de configurações gerais da aplicação
-- Data: 2024-12-13
-- Descrição: Migra configurações do .env para o banco de dados (admin panel)

-- Tabela para armazenar configurações gerais da aplicação
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
    
    -- Expo / Push Notifications
    expo_access_token VARCHAR(255),
    
    -- Telegram Collector (já tem tabela própria, mas pode ter configs extras)
    telegram_collector_rate_limit_delay DECIMAL(3,1) DEFAULT 1.0,
    telegram_collector_max_retries INTEGER DEFAULT 3,
    telegram_collector_reconnect_delay INTEGER DEFAULT 30,
    
    -- Backend API
    backend_url VARCHAR(500) DEFAULT 'http://localhost:3000',
    backend_api_key VARCHAR(255),
    
    -- Outras configurações
    python_path VARCHAR(255) DEFAULT 'python',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT single_settings CHECK (id = '00000000-0000-0000-0000-000000000001')
);

-- Inserir registro único (ou atualizar se já existir)
INSERT INTO app_settings (id, amazon_marketplace, backend_url, python_path)
VALUES ('00000000-0000-0000-0000-000000000001', 'www.amazon.com.br', 'http://localhost:3000', 'python')
ON CONFLICT (id) DO NOTHING;

-- Índices
CREATE INDEX IF NOT EXISTS idx_app_settings_id ON app_settings(id);

-- Comentários
COMMENT ON TABLE app_settings IS 'Configurações gerais da aplicação migradas do .env';
COMMENT ON COLUMN app_settings.meli_client_id IS 'Client ID do Mercado Livre';
COMMENT ON COLUMN app_settings.meli_client_secret IS 'Client Secret do Mercado Livre';
COMMENT ON COLUMN app_settings.meli_access_token IS 'Access Token do Mercado Livre (atualizado automaticamente)';
COMMENT ON COLUMN app_settings.meli_refresh_token IS 'Refresh Token do Mercado Livre';
COMMENT ON COLUMN app_settings.shopee_partner_id IS 'Partner ID da Shopee';
COMMENT ON COLUMN app_settings.shopee_partner_key IS 'Partner Key da Shopee';
COMMENT ON COLUMN app_settings.amazon_access_key IS 'Access Key da Amazon';
COMMENT ON COLUMN app_settings.amazon_secret_key IS 'Secret Key da Amazon';
COMMENT ON COLUMN app_settings.expo_access_token IS 'Access Token do Expo para push notifications';





