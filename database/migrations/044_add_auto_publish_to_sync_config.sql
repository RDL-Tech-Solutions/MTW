-- Migration: Adicionar campos de auto-publicação por plataforma
-- Descrição: Adiciona campos para controlar auto-publicação com análise estratégica da IA por plataforma

-- Adicionar colunas de auto-publicação para cada plataforma
ALTER TABLE sync_config
ADD COLUMN IF NOT EXISTS shopee_auto_publish BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mercadolivre_auto_publish BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS amazon_auto_publish BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS aliexpress_auto_publish BOOLEAN DEFAULT false;

-- Comentários nas colunas
COMMENT ON COLUMN sync_config.shopee_auto_publish IS 'Publicar automaticamente produtos da Shopee após análise estratégica da IA';
COMMENT ON COLUMN sync_config.mercadolivre_auto_publish IS 'Publicar automaticamente produtos do Mercado Livre após análise estratégica da IA';
COMMENT ON COLUMN sync_config.amazon_auto_publish IS 'Publicar automaticamente produtos da Amazon após análise estratégica da IA';
COMMENT ON COLUMN sync_config.aliexpress_auto_publish IS 'Publicar automaticamente produtos do AliExpress após análise estratégica da IA';


