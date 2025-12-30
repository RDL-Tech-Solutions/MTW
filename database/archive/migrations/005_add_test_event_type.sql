-- =====================================================
-- MIGRATION: Adicionar 'test' ao event_type
-- =====================================================

-- Remover constraint antigo e adicionar novo com 'test'
ALTER TABLE notification_logs 
DROP CONSTRAINT IF EXISTS notification_logs_event_type_check;

ALTER TABLE notification_logs 
ADD CONSTRAINT notification_logs_event_type_check 
CHECK (event_type IN ('promotion_new', 'coupon_new', 'coupon_expired', 'test', 'price_drop'));

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
SELECT 'Migration 005_add_test_event_type executada com sucesso!' as status;

