-- =====================================================
-- MIGRATION: 046_clean_all_products_and_coupons
-- Data: 2025-01-XX
-- Descrição: Script para limpar TODOS os produtos e TODOS os cupons do banco de dados
-- ATENÇÃO: Esta operação é IRREVERSÍVEL! Faça backup antes de executar.
-- =====================================================

-- =====================================================
-- AVISO IMPORTANTE
-- =====================================================
-- Este script irá DELETAR PERMANENTEMENTE:
-- - Todos os produtos
-- - Todos os cupons
-- - Histórico de preços
-- - Logs de sincronização relacionados
-- - Notificações relacionadas
-- - Logs de envio de bots relacionados
-- - Rastreamento de cliques relacionados
--
-- Esta operação NÃO PODE ser desfeita!
-- Faça backup do banco de dados antes de executar este script!
-- =====================================================

BEGIN;

-- =====================================================
-- 1. DELETAR DADOS RELACIONADOS (em ordem de dependência)
-- =====================================================

-- 1.1. Deletar histórico de preços (depende de products)
DELETE FROM price_history;

-- 1.2. Deletar rastreamento de cliques (depende de products e coupons)
DELETE FROM click_tracking 
WHERE product_id IS NOT NULL OR coupon_id IS NOT NULL;

-- 1.3. Deletar notificações relacionadas (depende de products e coupons)
DELETE FROM notifications 
WHERE related_product_id IS NOT NULL OR related_coupon_id IS NOT NULL;

-- 1.4. Deletar logs de envio de bots relacionados (depende de products e coupons)
-- Verificar se a tabela existe antes de deletar
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bot_send_logs') THEN
    -- Usa entity_type/entity_id (padrão)
    DELETE FROM bot_send_logs 
    WHERE (entity_type = 'product' AND entity_id IS NOT NULL) 
       OR (entity_type = 'coupon' AND entity_id IS NOT NULL)
       OR (entity_type = 'promotion_new' AND entity_id IS NOT NULL)
       OR (entity_type = 'coupon_new' AND entity_id IS NOT NULL);
    RAISE NOTICE 'Logs de envio de bots deletados';
  END IF;
END $$;

-- 1.5. Deletar logs de sincronização relacionados (depende de products)
-- Verificar se a tabela existe antes de deletar
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sync_logs') THEN
    DELETE FROM sync_logs 
    WHERE product_id IS NOT NULL;
    RAISE NOTICE 'Logs de sincronização deletados';
  END IF;
END $$;

-- 1.6. Deletar logs de captura de cupons (depende de coupons)
DELETE FROM coupon_sync_logs;

-- 1.7. Deletar duplicatas de produtos (depende de products)
-- Verificar se a tabela existe antes de deletar
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'product_duplicates') THEN
    DELETE FROM product_duplicates;
    RAISE NOTICE 'Duplicatas de produtos deletadas';
  END IF;
END $$;

-- 1.8. Deletar logs de decisão de IA relacionados (depende de products e coupons)
-- Verificar se a tabela existe antes de deletar
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ai_decision_logs') THEN
    DELETE FROM ai_decision_logs 
    WHERE (entity_type = 'product' AND entity_id IS NOT NULL) 
       OR (entity_type = 'coupon' AND entity_id IS NOT NULL);
    RAISE NOTICE 'Logs de decisão de IA deletados';
  END IF;
END $$;

-- 1.9. Deletar logs de notificações relacionados (se existir a tabela)
-- notification_logs não tem product_id/coupon_id, mas tem event_type relacionado
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notification_logs') THEN
    -- Deletar logs relacionados a produtos e cupons baseado no event_type
    DELETE FROM notification_logs 
    WHERE event_type IN ('promotion_new', 'coupon_new', 'coupon_expired', 'price_drop');
    RAISE NOTICE 'Logs de notificações deletados';
  END IF;
END $$;

-- =====================================================
-- 2. DELETAR PRODUTOS
-- =====================================================

-- 2.1. Desvincular cupons dos produtos (atualizar coupon_id para NULL)
UPDATE products SET coupon_id = NULL;

-- 2.2. Deletar todos os produtos
DELETE FROM products;

-- =====================================================
-- 3. DELETAR CUPONS
-- =====================================================

-- 3.1. Deletar todos os cupons
DELETE FROM coupons;

-- =====================================================
-- 4. RESETAR SEQUÊNCIAS (opcional, mas recomendado)
-- =====================================================

-- Resetar contadores de IDs (se houver sequências)
-- Nota: UUIDs não usam sequências, mas se houver alguma, resetar aqui

-- =====================================================
-- 5. VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se ainda há produtos
DO $$
DECLARE
  product_count INTEGER;
  coupon_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO product_count FROM products;
  SELECT COUNT(*) INTO coupon_count FROM coupons;
  
  IF product_count > 0 THEN
    RAISE WARNING 'Ainda existem % produto(s) no banco de dados', product_count;
  END IF;
  
  IF coupon_count > 0 THEN
    RAISE WARNING 'Ainda existem % cupom(ns) no banco de dados', coupon_count;
  END IF;
  
  RAISE NOTICE 'Limpeza concluída!';
  RAISE NOTICE 'Produtos restantes: %', product_count;
  RAISE NOTICE 'Cupons restantes: %', coupon_count;
END $$;

-- =====================================================
-- COMMIT OU ROLLBACK
-- =====================================================

-- Descomente a linha abaixo para confirmar a operação
-- COMMIT;

-- OU mantenha comentado para revisar antes de confirmar
-- Se não fizer COMMIT, a transação será revertida automaticamente

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
-- Este script deleta:
-- 1. Todos os produtos da tabela 'products'
-- 2. Todos os cupons da tabela 'coupons'
-- 3. Histórico de preços relacionado
-- 4. Rastreamento de cliques relacionado
-- 5. Notificações relacionadas
-- 6. Logs de envio de bots relacionados
-- 7. Logs de sincronização relacionados
-- 8. Logs de captura de cupons
--
-- IMPORTANTE:
-- - Esta operação é IRREVERSÍVEL
-- - Faça backup antes de executar
-- - Revise o script antes de executar
-- - Execute em ambiente de desenvolvimento primeiro
-- - Descomente o COMMIT apenas quando tiver certeza
--
-- Para executar apenas a limpeza sem transação:
-- Remova BEGIN; e COMMIT; e execute os comandos DELETE diretamente
-- =====================================================

-- =====================================================
-- VERSÃO SIMPLIFICADA (SEM TRANSAÇÃO)
-- =====================================================
-- Se preferir executar sem transação, use os comandos abaixo:
-- (Remova o BEGIN; e descomente os comandos abaixo)

/*
-- Deletar dados relacionados
DELETE FROM price_history;
DELETE FROM click_tracking WHERE product_id IS NOT NULL OR coupon_id IS NOT NULL;
DELETE FROM notifications WHERE related_product_id IS NOT NULL OR related_coupon_id IS NOT NULL;
DELETE FROM bot_send_logs WHERE (entity_type = 'product' AND entity_id IS NOT NULL) OR (entity_type = 'coupon' AND entity_id IS NOT NULL);
DELETE FROM sync_logs WHERE product_id IS NOT NULL;
DELETE FROM coupon_sync_logs;
DELETE FROM product_duplicates;
DELETE FROM ai_decision_logs WHERE (entity_type = 'product' AND entity_id IS NOT NULL) OR (entity_type = 'coupon' AND entity_id IS NOT NULL);
DELETE FROM notification_logs WHERE event_type IN ('promotion_new', 'coupon_new', 'coupon_expired', 'price_drop');

-- Desvincular e deletar produtos
UPDATE products SET coupon_id = NULL;
DELETE FROM products;

-- Deletar cupons
DELETE FROM coupons;
*/

