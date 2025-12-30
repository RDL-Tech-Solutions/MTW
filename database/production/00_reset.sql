-- ⚠️ CUIDADO: ESTE SCRIPT APAGA TODO O BANCO DE DADOS
-- Use apenas se quiser resetar completamente o projeto para uma instalação limpa.

-- 1. Desabilitar restrições para permitir drops
SET session_replication_role = 'replica';

-- 2. Apagar tabelas em ordem de dependência
DROP TABLE IF EXISTS "notification_logs" CASCADE;
DROP TABLE IF EXISTS "bot_send_logs" CASCADE;
DROP TABLE IF EXISTS "ai_decision_logs" CASCADE;
DROP TABLE IF EXISTS "click_tracking" CASCADE;
DROP TABLE IF EXISTS "coupon_sync_logs" CASCADE;
DROP TABLE IF EXISTS "notification_preferences" CASCADE;
DROP TABLE IF EXISTS "telegram_collector_config" CASCADE;
DROP TABLE IF EXISTS "price_history" CASCADE;
DROP TABLE IF EXISTS "product_duplicates" CASCADE;
DROP TABLE IF EXISTS "products" CASCADE;
DROP TABLE IF EXISTS "coupons" CASCADE;
DROP TABLE IF EXISTS "categories" CASCADE;
DROP TABLE IF EXISTS "notifications" CASCADE;
DROP TABLE IF EXISTS "bot_message_templates" CASCADE;
DROP TABLE IF EXISTS "bot_channels" CASCADE;
DROP TABLE IF EXISTS "bot_config" CASCADE;
DROP TABLE IF EXISTS "coupon_settings" CASCADE;
DROP TABLE IF EXISTS "app_settings" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- 3. Apagar funções e triggers customizados
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS update_bot_config_updated_at CASCADE;
DROP FUNCTION IF EXISTS update_bot_message_templates_updated_at CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_bot_send_logs CASCADE;
DROP FUNCTION IF EXISTS search_products CASCADE;
DROP FUNCTION IF EXISTS mark_expired_coupons CASCADE;
DROP FUNCTION IF EXISTS record_price_change CASCADE;

-- 4. Apagar Views
DROP VIEW IF EXISTS "active_coupons" CASCADE;
DROP VIEW IF EXISTS "products_full" CASCADE;
DROP VIEW IF EXISTS "product_stats" CASCADE;

-- 5. Restaurar restrições
SET session_replication_role = 'origin';

SELECT 'Banco de dados limpo com sucesso.' as status;
