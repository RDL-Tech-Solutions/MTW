-- =====================================================
-- Script: LIMPEZA RÁPIDA DE PRODUTOS E CUPONS
-- ⚠️ ATENÇÃO: Deleta TODOS os produtos e cupons!
-- Execute com cuidado!
-- =====================================================

BEGIN;

-- Desabilitar trigger (se existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'track_price_changes' 
        AND tgrelid = 'products'::regclass
    ) THEN
        ALTER TABLE products DISABLE TRIGGER track_price_changes;
    END IF;
END $$;

-- Limpar histórico de preços
DELETE FROM price_history;

-- Limpar rastreamento de cliques
DELETE FROM click_tracking;

-- Limpar referências em notificações
UPDATE notifications SET related_product_id = NULL WHERE related_product_id IS NOT NULL;
UPDATE notifications SET related_coupon_id = NULL WHERE related_coupon_id IS NOT NULL;

-- Limpar produtos
DELETE FROM products;

-- Limpar cupons
DELETE FROM coupons;

-- Limpar logs (se existirem)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sync_logs') THEN
        DELETE FROM sync_logs;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coupon_sync_logs') THEN
        DELETE FROM coupon_sync_logs;
    END IF;
END $$;

-- Reabilitar trigger (se existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'track_price_changes' 
        AND tgrelid = 'products'::regclass
    ) THEN
        ALTER TABLE products ENABLE TRIGGER track_price_changes;
    END IF;
END $$;

COMMIT;

-- Verificação
SELECT 
    (SELECT COUNT(*) FROM products) as produtos,
    (SELECT COUNT(*) FROM coupons) as cupons,
    (SELECT COUNT(*) FROM price_history) as historico_precos,
    (SELECT COUNT(*) FROM click_tracking) as rastreamento_cliques;






