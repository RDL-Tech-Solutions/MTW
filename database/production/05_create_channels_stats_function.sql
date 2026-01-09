-- =====================================================
-- FUNÇÃO RPC: Estatísticas de Canais Telegram
-- Data: 2026-01-08
-- Objetivo: Otimizar queries N+1 no controller
-- =====================================================

-- Criar função que retorna estatísticas agregadas de todos os canais
CREATE OR REPLACE FUNCTION get_telegram_channels_stats()
RETURNS TABLE (
  channel_origin TEXT,
  coupons_count BIGINT,
  last_message_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.channel_origin::TEXT,
    COUNT(*)::BIGINT as coupons_count,
    MAX(c.created_at) as last_message_at
  FROM coupons c
  WHERE c.origem = 'telegram'
    AND c.channel_origin IS NOT NULL
  GROUP BY c.channel_origin;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION get_telegram_channels_stats() IS 
'Retorna estatísticas agregadas de cupons por canal do Telegram. Usado para otimizar queries N+1 no telegramChannelController.';

-- Verificar resultado (teste)
SELECT * FROM get_telegram_channels_stats();

-- =====================================================
-- ✅ Função criada com sucesso!
-- ✅ Reduz 20+ queries para 1 query
-- =====================================================
