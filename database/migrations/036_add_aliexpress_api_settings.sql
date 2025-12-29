-- Migration: Adicionar campos de API do AliExpress na tabela app_settings
-- Data: 2025-01-20
-- Descrição: Adiciona campos para configuração da API do AliExpress (app_key, app_secret, tracking_id)

-- Adicionar colunas de API do AliExpress
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS aliexpress_app_key VARCHAR(255),
ADD COLUMN IF NOT EXISTS aliexpress_app_secret VARCHAR(255),
ADD COLUMN IF NOT EXISTS aliexpress_tracking_id VARCHAR(255);

-- Comentários nas colunas
COMMENT ON COLUMN app_settings.aliexpress_app_key IS 'App Key da API do AliExpress';
COMMENT ON COLUMN app_settings.aliexpress_app_secret IS 'App Secret da API do AliExpress (sensível)';
COMMENT ON COLUMN app_settings.aliexpress_tracking_id IS 'Tracking ID para links de afiliado do AliExpress';




