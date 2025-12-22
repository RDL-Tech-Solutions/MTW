-- =====================================================
-- Migration: Tornar valid_until opcional nos cupons
-- Data: 2024-12-22
-- Descrição: Altera a coluna valid_until para permitir NULL, 
--            permitindo cupons sem data de expiração definida
-- =====================================================

-- Remover constraint NOT NULL da coluna valid_until
ALTER TABLE coupons
ALTER COLUMN valid_until DROP NOT NULL;

-- Atualizar view de cupons ativos para considerar NULL em valid_until
CREATE OR REPLACE VIEW active_coupons AS
SELECT *
FROM coupons
WHERE is_active = TRUE
  AND verification_status = 'active'
  AND (valid_until IS NULL OR valid_until > NOW())
  AND (max_uses IS NULL OR current_uses < max_uses);

-- Comentário na coluna
COMMENT ON COLUMN coupons.valid_until IS 'Data de expiração do cupom. NULL indica que o cupom não tem data de expiração definida.';

-- Verificar se a migration foi aplicada com sucesso
SELECT 'Migration 042 aplicada com sucesso! A coluna valid_until agora permite NULL.' as status;

