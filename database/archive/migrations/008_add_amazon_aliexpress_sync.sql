-- =====================================================
-- Migration: Adicionar suporte para Amazon e AliExpress
-- Data: 13/12/2024
-- =====================================================

-- Adicionar colunas amazon_enabled e aliexpress_enabled na tabela sync_config
ALTER TABLE sync_config 
ADD COLUMN IF NOT EXISTS amazon_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS aliexpress_enabled BOOLEAN DEFAULT false;

-- Atualizar sync_logs para aceitar novas plataformas
ALTER TABLE sync_logs 
DROP CONSTRAINT IF EXISTS sync_logs_platform_check;

ALTER TABLE sync_logs 
ADD CONSTRAINT sync_logs_platform_check 
CHECK (platform IN ('shopee', 'mercadolivre', 'amazon', 'aliexpress'));

-- Atualizar products para aceitar novas plataformas
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS products_platform_check;

ALTER TABLE products 
ADD CONSTRAINT products_platform_check 
CHECK (platform IN ('shopee', 'mercadolivre', 'amazon', 'aliexpress', 'general'));

-- Atualizar coupons para aceitar novas plataformas
ALTER TABLE coupons 
DROP CONSTRAINT IF EXISTS coupons_platform_check;

ALTER TABLE coupons 
ADD CONSTRAINT coupons_platform_check 
CHECK (platform IN ('shopee', 'mercadolivre', 'amazon', 'aliexpress', 'general'));

-- Comentários
COMMENT ON COLUMN sync_config.amazon_enabled IS 'Habilitar sincronização automática da Amazon';
COMMENT ON COLUMN sync_config.aliexpress_enabled IS 'Habilitar sincronização automática do AliExpress';

