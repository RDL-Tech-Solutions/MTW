-- Adicionar coluna offer_score na tabela products
-- Esta coluna armazena o score de qualidade da oferta calculado pela IA

-- Adicionar coluna offer_score (valor de 0 a 100 com 2 casas decimais)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS offer_score NUMERIC(5, 2) DEFAULT NULL;

-- Adicionar coluna offer_priority se não existir
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS offer_priority VARCHAR(20) DEFAULT NULL;

-- Adicionar coluna is_featured_offer se não existir
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_featured_offer BOOLEAN DEFAULT FALSE;

-- Índice para buscar produtos por score
CREATE INDEX IF NOT EXISTS idx_products_offer_score ON products(offer_score DESC NULLS LAST);

-- Atualizar produtos existentes com score baseado no desconto (migração de dados)
UPDATE products 
SET offer_score = 
  CASE 
    WHEN discount_percentage >= 50 THEN discount_percentage + 10
    WHEN discount_percentage >= 30 THEN discount_percentage + 5
    WHEN discount_percentage >= 10 THEN discount_percentage
    ELSE 5
  END
WHERE offer_score IS NULL AND discount_percentage IS NOT NULL AND discount_percentage > 0;

-- Definir prioridade baseada no score
UPDATE products 
SET offer_priority = 
  CASE 
    WHEN offer_score >= 70 THEN 'high'
    WHEN offer_score >= 40 THEN 'medium'
    ELSE 'low'
  END
WHERE offer_score IS NOT NULL AND offer_priority IS NULL;

COMMENT ON COLUMN products.offer_score IS 'Score de qualidade da oferta (0-100), calculado por IA considerando desconto, histórico, popularidade, CTR e confiança';
