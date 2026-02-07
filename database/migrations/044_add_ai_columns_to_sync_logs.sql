-- Adicionar colunas de estatísticas de IA à tabela coupon_sync_logs
-- Útil para rastrear eficiência da filtragem e otimização por IA

ALTER TABLE coupon_sync_logs 
ADD COLUMN IF NOT EXISTS ai_optimized INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_filtered INTEGER DEFAULT 0;

COMMENT ON COLUMN coupon_sync_logs.ai_optimized IS 'Quantidade de cupons que tiveram descrição otimizada por IA';
COMMENT ON COLUMN coupon_sync_logs.ai_filtered IS 'Quantidade de cupons que foram filtrados pela IA';
