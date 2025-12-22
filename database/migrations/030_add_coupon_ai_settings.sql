-- Adicionar configurações de IA para captura de cupons
ALTER TABLE coupon_settings
ADD COLUMN IF NOT EXISTS use_ai_filtering BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS use_ai_optimization BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_min_quality_score DECIMAL(3,2) DEFAULT 0.60,
ADD COLUMN IF NOT EXISTS ai_min_relevance_score DECIMAL(3,2) DEFAULT 0.50,
ADD COLUMN IF NOT EXISTS ai_min_price_score DECIMAL(3,2) DEFAULT 0.50,
ADD COLUMN IF NOT EXISTS ai_require_good_deal BOOLEAN DEFAULT false;

-- Comentários
COMMENT ON COLUMN coupon_settings.use_ai_filtering IS 'Usar IA para filtrar cupons automaticamente';
COMMENT ON COLUMN coupon_settings.use_ai_optimization IS 'Usar IA para otimizar descrições de cupons';
COMMENT ON COLUMN coupon_settings.ai_min_quality_score IS 'Score mínimo de qualidade (0.0-1.0)';
COMMENT ON COLUMN coupon_settings.ai_min_relevance_score IS 'Score mínimo de relevância (0.0-1.0)';
COMMENT ON COLUMN coupon_settings.ai_min_price_score IS 'Score mínimo de preço (0.0-1.0)';
COMMENT ON COLUMN coupon_settings.ai_require_good_deal IS 'Requerer que seja uma boa oportunidade';







