-- =====================================================
-- Script: LIMPEZA COMPLETA DE PRODUTOS E CUPONS
-- Data: 18/12/2024
-- ⚠️ ATENÇÃO: Este script irá DELETAR TODOS os produtos e cupons!
-- ⚠️ Use com EXTREMO CUIDADO e certifique-se de ter um BACKUP antes de executar!
-- =====================================================

-- Verificar quantos registros serão deletados antes de começar
DO $$
DECLARE
    product_count INTEGER;
    coupon_count INTEGER;
    price_history_count INTEGER;
    click_tracking_count INTEGER;
    notification_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO product_count FROM products;
    SELECT COUNT(*) INTO coupon_count FROM coupons;
    SELECT COUNT(*) INTO price_history_count FROM price_history;
    SELECT COUNT(*) INTO click_tracking_count FROM click_tracking;
    SELECT COUNT(*) INTO notification_count FROM notifications WHERE related_product_id IS NOT NULL OR related_coupon_id IS NOT NULL;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '⚠️  LIMPEZA COMPLETA - RESUMO ANTES';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Produtos: %', product_count;
    RAISE NOTICE 'Cupons: %', coupon_count;
    RAISE NOTICE 'Histórico de preços: %', price_history_count;
    RAISE NOTICE 'Rastreamento de cliques: %', click_tracking_count;
    RAISE NOTICE 'Notificações relacionadas: %', notification_count;
    RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- INÍCIO DA TRANSAÇÃO
-- =====================================================
BEGIN;

-- =====================================================
-- 1. DESABILITAR TRIGGERS E CONSTRAINTS
-- =====================================================

-- Desabilitar trigger de histórico de preços (se existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'track_price_changes' 
        AND tgrelid = 'products'::regclass
    ) THEN
        ALTER TABLE products DISABLE TRIGGER track_price_changes;
        RAISE NOTICE '✅ Trigger track_price_changes desabilitado';
    ELSE
        RAISE NOTICE '⚠️ Trigger track_price_changes não encontrado (pode não existir)';
    END IF;
END $$;

-- =====================================================
-- 2. LIMPAR DADOS RELACIONADOS A PRODUTOS
-- =====================================================

-- Limpar histórico de preços (será deletado automaticamente por CASCADE, mas vamos fazer explicitamente)
DELETE FROM price_history;
DO $$ BEGIN RAISE NOTICE '✅ Histórico de preços limpo'; END $$;

-- Limpar rastreamento de cliques relacionados a produtos
DELETE FROM click_tracking WHERE product_id IS NOT NULL;
DO $$ BEGIN RAISE NOTICE '✅ Rastreamento de cliques de produtos limpo'; END $$;

-- Limpar referências de produtos em notificações (setar para NULL)
UPDATE notifications 
SET related_product_id = NULL 
WHERE related_product_id IS NOT NULL;
DO $$ BEGIN RAISE NOTICE '✅ Referências de produtos em notificações limpas'; END $$;

-- Limpar analytics relacionados a produtos (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics') THEN
        DELETE FROM analytics WHERE product_id IS NOT NULL;
        RAISE NOTICE '✅ Analytics de produtos limpo';
    END IF;
END $$;

-- =====================================================
-- 3. LIMPAR PRODUTOS
-- =====================================================

-- Deletar todos os produtos
-- Isso também vai deletar automaticamente:
-- - price_history (CASCADE)
-- - click_tracking relacionado (CASCADE)
DELETE FROM products;
DO $$ BEGIN RAISE NOTICE '✅ Todos os produtos deletados'; END $$;

-- =====================================================
-- 4. LIMPAR DADOS RELACIONADOS A CUPONS
-- =====================================================

-- Limpar rastreamento de cliques relacionados a cupons
DELETE FROM click_tracking WHERE coupon_id IS NOT NULL;
DO $$ BEGIN RAISE NOTICE '✅ Rastreamento de cliques de cupons limpo'; END $$;

-- Limpar referências de cupons em notificações (setar para NULL)
UPDATE notifications 
SET related_coupon_id = NULL 
WHERE related_coupon_id IS NOT NULL;
DO $$ BEGIN RAISE NOTICE '✅ Referências de cupons em notificações limpas'; END $$;

-- Limpar logs de sincronização de cupons (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coupon_sync_logs') THEN
        DELETE FROM coupon_sync_logs;
        RAISE NOTICE '✅ Logs de sincronização de cupons limpos';
    END IF;
END $$;

-- Limpar analytics relacionados a cupons (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics') THEN
        DELETE FROM analytics WHERE coupon_id IS NOT NULL;
        RAISE NOTICE '✅ Analytics de cupons limpo';
    END IF;
END $$;

-- =====================================================
-- 5. LIMPAR CUPONS
-- =====================================================

-- Deletar todos os cupons
DELETE FROM coupons;
DO $$ BEGIN RAISE NOTICE '✅ Todos os cupons deletados'; END $$;

-- =====================================================
-- 6. LIMPAR LOGS DE SINCRONIZAÇÃO
-- =====================================================

-- Limpar logs de sincronização de produtos
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sync_logs') THEN
        DELETE FROM sync_logs;
        RAISE NOTICE '✅ Logs de sincronização limpos';
    END IF;
END $$;

-- =====================================================
-- 7. LIMPAR FAVORITOS (se existir)
-- =====================================================

-- Limpar favoritos relacionados a produtos (se a tabela existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'favorites') THEN
        DELETE FROM favorites WHERE product_id IS NOT NULL;
        RAISE NOTICE '✅ Favoritos limpos';
    END IF;
END $$;

-- =====================================================
-- 8. REABILITAR TRIGGERS
-- =====================================================

-- Reabilitar o trigger de histórico de preços (se existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'track_price_changes' 
        AND tgrelid = 'products'::regclass
    ) THEN
        ALTER TABLE products ENABLE TRIGGER track_price_changes;
        RAISE NOTICE '✅ Trigger track_price_changes reabilitado';
    END IF;
END $$;

-- =====================================================
-- 9. VERIFICAÇÃO FINAL
-- =====================================================

DO $$
DECLARE
    product_count INTEGER;
    coupon_count INTEGER;
    price_history_count INTEGER;
    click_tracking_count INTEGER;
    sync_logs_count INTEGER;
    coupon_sync_logs_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO product_count FROM products;
    SELECT COUNT(*) INTO coupon_count FROM coupons;
    SELECT COUNT(*) INTO price_history_count FROM price_history;
    SELECT COUNT(*) INTO click_tracking_count FROM click_tracking;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sync_logs') THEN
        SELECT COUNT(*) INTO sync_logs_count FROM sync_logs;
    ELSE
        sync_logs_count := 0;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coupon_sync_logs') THEN
        SELECT COUNT(*) INTO coupon_sync_logs_count FROM coupon_sync_logs;
    ELSE
        coupon_sync_logs_count := 0;
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ LIMPEZA CONCLUÍDA - VERIFICAÇÃO FINAL';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Produtos restantes: %', product_count;
    RAISE NOTICE 'Cupons restantes: %', coupon_count;
    RAISE NOTICE 'Histórico de preços restante: %', price_history_count;
    RAISE NOTICE 'Rastreamento de cliques restante: %', click_tracking_count;
    RAISE NOTICE 'Logs de sincronização restantes: %', sync_logs_count;
    RAISE NOTICE 'Logs de sincronização de cupons restantes: %', coupon_sync_logs_count;
    RAISE NOTICE '========================================';
    
    IF product_count > 0 OR coupon_count > 0 THEN
        RAISE WARNING '⚠️ Ainda existem registros! Verifique manualmente.';
    ELSE
        RAISE NOTICE '✅ Limpeza completa realizada com sucesso!';
    END IF;
END $$;

-- =====================================================
-- COMMIT DA TRANSAÇÃO
-- =====================================================
COMMIT;

-- =====================================================
-- VERIFICAÇÃO ADICIONAL (após commit)
-- =====================================================

SELECT 
    'Produtos' as tabela,
    COUNT(*) as total
FROM products
UNION ALL
SELECT 
    'Cupons' as tabela,
    COUNT(*) as total
FROM coupons
UNION ALL
SELECT 
    'Histórico de Preços' as tabela,
    COUNT(*) as total
FROM price_history
UNION ALL
SELECT 
    'Rastreamento de Cliques' as tabela,
    COUNT(*) as total
FROM click_tracking
UNION ALL
SELECT 
    'Logs de Sincronização' as tabela,
    COUNT(*) as total
FROM sync_logs;







