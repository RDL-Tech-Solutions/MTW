-- ============================================
-- Migration: Substituir Terabyte por Pichau
-- Data: 2026-01-16
-- ============================================

-- 1. Adicionar colunas de configuração Pichau em sync_config
ALTER TABLE sync_config
ADD COLUMN IF NOT EXISTS pichau_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pichau_auto_publish BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pichau_shorten_link BOOLEAN DEFAULT FALSE;

-- 2. Remover colunas antigas do Terabyte (se existirem)
ALTER TABLE sync_config
DROP COLUMN IF EXISTS terabyteshop_enabled,
DROP COLUMN IF EXISTS terabyteshop_auto_publish,
DROP COLUMN IF EXISTS terabyteshop_shorten_link;

-- 3. Atualizar produtos existentes do Terabyte para Pichau
UPDATE products
SET platform = 'pichau'
WHERE platform = 'terabyteshop' OR platform = 'terabyte';

-- 4. Atualizar cupons existentes do Terabyte para Pichau
UPDATE coupons
SET platform = 'pichau'
WHERE platform = 'terabyteshop' OR platform = 'terabyte';

-- 5. Atualizar logs de sincronização
UPDATE sync_logs
SET platform = 'pichau'
WHERE platform = 'terabyteshop' OR platform = 'terabyte';

-- 6. Comentários para documentação
COMMENT ON COLUMN sync_config.pichau_enabled IS 'Habilitar sincronização automática com Pichau';
COMMENT ON COLUMN sync_config.pichau_auto_publish IS 'Publicar automaticamente produtos da Pichau';
COMMENT ON COLUMN sync_config.pichau_shorten_link IS 'Encurtar links de afiliado da Pichau';

-- 7. Atualizar constraints de plataforma (se existirem)
-- Remover constraint antiga
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_platform_check;

-- Adicionar nova constraint com Pichau
ALTER TABLE products ADD CONSTRAINT products_platform_check 
  CHECK (platform IN ('shopee', 'mercadolivre', 'amazon', 'aliexpress', 'kabum', 'magazineluiza', 'pichau', 'general', 'unknown'));

-- Fazer o mesmo para coupons
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_platform_check;

ALTER TABLE coupons ADD CONSTRAINT coupons_platform_check 
  CHECK (platform IN ('shopee', 'mercadolivre', 'amazon', 'aliexpress', 'kabum', 'magazineluiza', 'pichau', 'general', 'unknown'));

-- ============================================
-- Verificação (opcional - executar separadamente)
-- ============================================

-- Verificar produtos migrados
-- SELECT COUNT(*) as total_pichau FROM products WHERE platform = 'pichau';

-- Verificar se ainda existem produtos Terabyte
-- SELECT COUNT(*) as total_terabyte FROM products WHERE platform IN ('terabyteshop', 'terabyte');

-- Verificar configuração
-- SELECT pichau_enabled, pichau_auto_publish, pichau_shorten_link FROM sync_config LIMIT 1;
