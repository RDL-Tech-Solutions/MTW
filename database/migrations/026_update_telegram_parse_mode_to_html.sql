-- =====================================================
-- Migration: 026_update_telegram_parse_mode_to_html
-- Data: 2024-12-XX
-- Descrição: Atualiza telegram_parse_mode padrão para HTML
-- =====================================================

-- Atualizar o valor padrão da coluna
ALTER TABLE bot_config 
ALTER COLUMN telegram_parse_mode SET DEFAULT 'HTML';

-- Atualizar registros existentes que estão com 'Markdown' ou 'MarkdownV2' para 'HTML'
-- HTML é mais confiável e suporta todas as formatações (negrito, riscado, itálico, etc)
UPDATE bot_config 
SET telegram_parse_mode = 'HTML',
    updated_at = NOW()
WHERE telegram_parse_mode IN ('Markdown', 'MarkdownV2')
   OR telegram_parse_mode IS NULL;

-- Se não houver registro, criar um com HTML como padrão
INSERT INTO bot_config (
  id,
  telegram_parse_mode,
  telegram_enabled,
  whatsapp_enabled,
  notify_new_products,
  notify_new_coupons,
  notify_expired_coupons,
  notify_price_drops,
  min_discount_to_notify
)
SELECT 
  uuid_generate_v4(),
  'HTML',
  FALSE,
  FALSE,
  TRUE,
  TRUE,
  FALSE,
  TRUE,
  20
WHERE NOT EXISTS (SELECT 1 FROM bot_config LIMIT 1);

-- Comentário explicativo
COMMENT ON COLUMN bot_config.telegram_parse_mode IS 'Modo de parsing do Telegram: HTML (recomendado), Markdown, MarkdownV2. HTML suporta todas as formatações e é mais confiável.';

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
SELECT 'Migration 026_update_telegram_parse_mode_to_html executada com sucesso!' as status;








