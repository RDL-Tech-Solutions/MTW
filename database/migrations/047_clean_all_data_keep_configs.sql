-- =====================================================
-- MIGRATION: 047_clean_all_data_keep_configs
-- Data: 2025-01-XX
-- Descrição: Limpa TODOS os dados do banco, mantendo apenas configurações
-- ATENÇÃO: Esta operação é IRREVERSÍVEL! Faça backup antes de executar.
-- =====================================================

-- =====================================================
-- AVISO IMPORTANTE
-- =====================================================
-- Este script irá DELETAR PERMANENTEMENTE TODOS OS DADOS:
-- - Todos os produtos
-- - Todos os cupons
-- - Todos os usuários (exceto admins se necessário)
-- - Todas as categorias (exceto padrões se necessário)
-- - Histórico de preços
-- - Logs de sincronização
-- - Notificações
-- - Logs de envio de bots
-- - Rastreamento de cliques
-- - Logs de decisão de IA
-- - Duplicatas de produtos
-- - Logs de notificações
--
-- TABELAS QUE SERÃO MANTIDAS (CONFIGURAÇÕES):
-- - app_settings (configurações gerais)
-- - bot_config (configurações de bots)
-- - bot_channels (canais de bots)
-- - bot_message_templates (templates de mensagens)
-- - telegram_channels (canais Telegram)
-- - telegram_collector_config (configurações do coletor Telegram)
-- - sync_config (configurações de sincronização)
-- - coupon_settings (configurações de cupons)
--
-- Esta operação NÃO PODE ser desfeita!
-- Faça backup do banco de dados antes de executar este script!
-- =====================================================

BEGIN;

-- =====================================================
-- 1. DELETAR DADOS RELACIONADOS (em ordem de dependência)
-- =====================================================

-- 1.1. Deletar histórico de preços
DELETE FROM price_history;

-- 1.2. Deletar rastreamento de cliques
DELETE FROM click_tracking;

-- 1.3. Deletar notificações de usuários
DELETE FROM notifications;

-- 1.4. Deletar logs de envio de bots
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bot_send_logs') THEN
    DELETE FROM bot_send_logs;
    RAISE NOTICE 'Logs de envio de bots deletados';
  END IF;
END $$;

-- 1.5. Deletar logs de sincronização
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sync_logs') THEN
    DELETE FROM sync_logs;
    RAISE NOTICE 'Logs de sincronização deletados';
  END IF;
END $$;

-- 1.6. Deletar logs de captura de cupons
DELETE FROM coupon_sync_logs;

-- 1.7. Deletar duplicatas de produtos
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'product_duplicates') THEN
    DELETE FROM product_duplicates;
    RAISE NOTICE 'Duplicatas de produtos deletadas';
  END IF;
END $$;

-- 1.8. Deletar logs de decisão de IA
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ai_decision_logs') THEN
    DELETE FROM ai_decision_logs;
    RAISE NOTICE 'Logs de decisão de IA deletados';
  END IF;
END $$;

-- 1.9. Deletar logs de notificações (relacionados a produtos/cupons)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notification_logs') THEN
    DELETE FROM notification_logs 
    WHERE event_type IN ('promotion_new', 'coupon_new', 'coupon_expired', 'price_drop');
    RAISE NOTICE 'Logs de notificações deletados';
  END IF;
END $$;

-- =====================================================
-- 2. DESVINCULAR E DELETAR PRODUTOS
-- =====================================================

-- 2.1. Desvincular cupons dos produtos
UPDATE products SET coupon_id = NULL;

-- 2.2. Deletar todos os produtos
DELETE FROM products;

-- =====================================================
-- 3. DELETAR CUPONS
-- =====================================================

-- 3.1. Deletar todos os cupons
DELETE FROM coupons;

-- =====================================================
-- 4. DELETAR USUÁRIOS (OPCIONAL - descomente se quiser limpar)
-- =====================================================

-- IMPORTANTE: Descomente as linhas abaixo se quiser deletar TODOS os usuários
-- Caso contrário, mantenha comentado para preservar usuários (incluindo admins)

-- DELETE FROM users WHERE role != 'admin'; -- Deletar apenas usuários não-admin
-- DELETE FROM users; -- Deletar TODOS os usuários (incluindo admins)

-- =====================================================
-- 5. DELETAR CATEGORIAS (OPCIONAL - descomente se quiser limpar)
-- =====================================================

-- IMPORTANTE: Descomente a linha abaixo se quiser deletar TODAS as categorias
-- Caso contrário, mantenha comentado para preservar categorias padrão

-- DELETE FROM categories;

-- =====================================================
-- 6. VERIFICAÇÃO FINAL
-- =====================================================

DO $$
DECLARE
  product_count INTEGER;
  coupon_count INTEGER;
  user_count INTEGER;
  category_count INTEGER;
  price_history_count INTEGER;
  click_tracking_count INTEGER;
  notification_count INTEGER;
BEGIN
  -- Contar registros restantes
  SELECT COUNT(*) INTO product_count FROM products;
  SELECT COUNT(*) INTO coupon_count FROM coupons;
  SELECT COUNT(*) INTO user_count FROM users;
  SELECT COUNT(*) INTO category_count FROM categories;
  SELECT COUNT(*) INTO price_history_count FROM price_history;
  SELECT COUNT(*) INTO click_tracking_count FROM click_tracking;
  SELECT COUNT(*) INTO notification_count FROM notifications;
  
  -- Exibir resultados
  RAISE NOTICE '========================================';
  RAISE NOTICE 'LIMPEZA CONCLUÍDA!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Produtos restantes: %', product_count;
  RAISE NOTICE 'Cupons restantes: %', coupon_count;
  RAISE NOTICE 'Usuários restantes: %', user_count;
  RAISE NOTICE 'Categorias restantes: %', category_count;
  RAISE NOTICE 'Histórico de preços restante: %', price_history_count;
  RAISE NOTICE 'Rastreamento de cliques restante: %', click_tracking_count;
  RAISE NOTICE 'Notificações restantes: %', notification_count;
  RAISE NOTICE '========================================';
  
  -- Avisos se ainda houver dados
  IF product_count > 0 THEN
    RAISE WARNING 'Ainda existem % produto(s) no banco de dados', product_count;
  END IF;
  
  IF coupon_count > 0 THEN
    RAISE WARNING 'Ainda existem % cupom(ns) no banco de dados', coupon_count;
  END IF;
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
-- 1. Todos os produtos
-- 2. Todos os cupons
-- 3. Histórico de preços
-- 4. Rastreamento de cliques
-- 5. Notificações de usuários
-- 6. Logs de envio de bots
-- 7. Logs de sincronização
-- 8. Logs de captura de cupons
-- 9. Duplicatas de produtos
-- 10. Logs de decisão de IA
-- 11. Logs de notificações relacionadas
--
-- TABELAS PRESERVADAS (CONFIGURAÇÕES):
-- - app_settings
-- - bot_config
-- - bot_channels
-- - bot_message_templates
-- - telegram_channels
-- - telegram_collector_config
-- - sync_config
-- - coupon_settings
--
-- IMPORTANTE:
-- - Esta operação é IRREVERSÍVEL
-- - Faça backup antes de executar
-- - Revise o script antes de executar
-- - Execute em ambiente de desenvolvimento primeiro
-- - Descomente o COMMIT apenas quando tiver certeza
-- - Usuários e categorias são preservados por padrão (descomente se quiser deletar)
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
DELETE FROM click_tracking;
DELETE FROM notifications;
DELETE FROM bot_send_logs;
DELETE FROM sync_logs;
DELETE FROM coupon_sync_logs;
DELETE FROM product_duplicates;
DELETE FROM ai_decision_logs;
DELETE FROM notification_logs WHERE event_type IN ('promotion_new', 'coupon_new', 'coupon_expired', 'price_drop');

-- Desvincular e deletar produtos
UPDATE products SET coupon_id = NULL;
DELETE FROM products;

-- Deletar cupons
DELETE FROM coupons;

-- Opcional: Deletar usuários (descomente se necessário)
-- DELETE FROM users WHERE role != 'admin';
-- DELETE FROM users;

-- Opcional: Deletar categorias (descomente se necessário)
-- DELETE FROM categories;
*/

