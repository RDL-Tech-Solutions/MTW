-- Migration: Adicionar campo de origem de produtos do AliExpress
-- Data: 2025-01-20
-- Descrição: Permite escolher se quer capturar produtos do Brasil, internacionais ou ambos

-- Adicionar coluna para origem de produtos do AliExpress
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS aliexpress_product_origin VARCHAR(20) DEFAULT 'both' CHECK (aliexpress_product_origin IN ('brazil', 'international', 'both'));

-- Comentário na coluna
COMMENT ON COLUMN app_settings.aliexpress_product_origin IS 'Origem dos produtos AliExpress: brazil (apenas Brasil), international (apenas internacionais), both (ambos)';

-- Valor padrão: ambos
UPDATE app_settings
SET aliexpress_product_origin = 'both'
WHERE aliexpress_product_origin IS NULL;


