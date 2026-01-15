-- Migration: Add AliExpress Product Origin Configuration
-- Adiciona coluna para configurar origem dos produtos (Brasil, Internacional, Ambos)

-- 1. Adicionar coluna aliexpress_product_origin na tabela app_settings
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS aliexpress_product_origin VARCHAR(20) DEFAULT 'both';

-- 2. Adicionar comentário explicativo
COMMENT ON COLUMN app_settings.aliexpress_product_origin IS 'Origem dos produtos AliExpress: brazil (apenas Brasil), international (apenas Internacional), both (ambos)';

-- 3. Adicionar constraint para validar valores permitidos
ALTER TABLE app_settings
ADD CONSTRAINT check_aliexpress_product_origin 
CHECK (aliexpress_product_origin IN ('brazil', 'international', 'both'));
