-- ========================================
-- SQL Queries para Debug de Notificações
-- ========================================

-- 1. VERIFICAR TOKENS FCM REGISTRADOS
-- Mostra todos os tokens FCM com informações do usuário
SELECT 
  u.id as user_id,
  u.email,
  u.name,
  ft.platform,
  ft.device_id,
  ft.created_at as token_created_at,
  LEFT(ft.fcm_token, 30) || '...' as token_preview,
  LENGTH(ft.fcm_token) as token_length
FROM fcm_tokens ft
JOIN users u ON u.id = ft.user_id
ORDER BY ft.created_at DESC;

-- Resultado esperado: Pelo menos 1 token para usuário de teste
-- Se retornar 0 linhas: PROBLEMA - Usuários não registraram tokens


-- 2. VERIFICAR NOTIFICAÇÕES CRIADAS
-- Mostra últimas notificações criadas no banco
SELECT 
  n.id,
  n.type,
  n.title,
  LEFT(n.message, 50) || '...' as message_preview,
  n.sent_at,
  n.created_at,
  u.email as user_email,
  u.name as user_name,
  CASE 
    WHEN n.sent_at IS NOT NULL THEN 'ENVIADA ✅'
    ELSE 'PENDENTE ⏳'
  END as status
FROM notifications n
JOIN users u ON u.id = n.user_id
ORDER BY n.created_at DESC
LIMIT 20;

-- Resultado esperado: Notificações sendo criadas quando produtos são aprovados
-- Se retornar 0 linhas: PROBLEMA - publishService.notifyPush() não está sendo chamado


-- 3. VERIFICAR PREFERÊNCIAS DE NOTIFICAÇÃO
-- Mostra preferências de cada usuário
SELECT 
  id,
  email,
  name,
  notification_preferences,
  CASE 
    WHEN notification_preferences IS NULL THEN 'PADRÃO (todas ativadas) ✅'
    WHEN notification_preferences::jsonb ? 'new_products' 
      AND (notification_preferences::jsonb->>'new_products')::boolean = false 
      THEN 'PRODUTOS DESABILITADOS ❌'
    WHEN notification_preferences::jsonb ? 'new_coupons' 
      AND (notification_preferences::jsonb->>'new_coupons')::boolean = false 
      THEN 'CUPONS DESABILITADOS ❌'
    ELSE 'ATIVADAS ✅'
  END as status_notificacoes
FROM users
ORDER BY created_at DESC;

-- Resultado esperado: Preferências não devem bloquear tudo
-- Se todas estiverem desabilitadas: PROBLEMA - Segmentação bloqueará todos


-- 4. VERIFICAR PRODUTOS RECENTES E CAMPO should_send_push
-- Mostra produtos recentes e se IA desabilitou push
SELECT 
  id,
  name,
  status,
  should_send_push,
  should_send_to_bots,
  offer_priority,
  offer_score,
  ai_decision_reason,
  created_at,
  CASE 
    WHEN should_send_push = false THEN 'PUSH DESABILITADO PELA IA ❌'
    WHEN should_send_push IS NULL OR should_send_push = true THEN 'PUSH ATIVADO ✅'
  END as push_status
FROM products
ORDER BY created_at DESC
LIMIT 10;

-- Resultado esperado: Alguns produtos com push ativado
-- Se todos tiverem should_send_push = false: IA está bloqueando (normal para produtos ruins)


-- 5. VERIFICAR CUPONS E STATUS
-- Mostra cupons recentes e status
SELECT 
  id,
  code,
  platform,
  is_active,
  is_out_of_stock,
  discount_type,
  discount_value,
  valid_until,
  created_at,
  CASE 
    WHEN is_out_of_stock = true THEN 'ESGOTADO ⚠️'
    WHEN is_active = false THEN 'INATIVO ❌'
    WHEN valid_until < NOW() THEN 'EXPIRADO ⏰'
    ELSE 'ATIVO ✅'
  END as status
FROM coupons
ORDER BY created_at DESC
LIMIT 10;

-- Resultado esperado: Cupons com diferentes status


-- 6. CONTAR NOTIFICAÇÕES POR TIPO
-- Estatísticas de notificações
SELECT 
  type,
  COUNT(*) as total,
  COUNT(CASE WHEN sent_at IS NOT NULL THEN 1 END) as enviadas,
  COUNT(CASE WHEN sent_at IS NULL THEN 1 END) as pendentes,
  MAX(created_at) as ultima_criada
FROM notifications
GROUP BY type
ORDER BY total DESC;

-- Resultado esperado: Distribuição de notificações por tipo


-- 7. VERIFICAR NOTIFICAÇÕES DE PRODUTOS ESPECÍFICOS
-- Mostra notificações relacionadas a produtos
SELECT 
  n.id,
  n.type,
  n.title,
  n.message,
  n.sent_at,
  n.created_at,
  p.name as product_name,
  p.status as product_status,
  u.email as user_email
FROM notifications n
LEFT JOIN products p ON p.id = n.related_product_id
JOIN users u ON u.id = n.user_id
WHERE n.related_product_id IS NOT NULL
ORDER BY n.created_at DESC
LIMIT 20;

-- Resultado esperado: Notificações vinculadas a produtos aprovados


-- 8. VERIFICAR NOTIFICAÇÕES DE CUPONS ESPECÍFICOS
-- Mostra notificações relacionadas a cupons
SELECT 
  n.id,
  n.type,
  n.title,
  n.message,
  n.sent_at,
  n.created_at,
  c.code as coupon_code,
  c.is_active as coupon_active,
  c.is_out_of_stock as coupon_out_of_stock,
  u.email as user_email
FROM notifications n
LEFT JOIN coupons c ON c.id = n.related_coupon_id
JOIN users u ON u.id = n.user_id
WHERE n.related_coupon_id IS NOT NULL
ORDER BY n.created_at DESC
LIMIT 20;

-- Resultado esperado: Notificações vinculadas a cupons


-- 9. VERIFICAR USUÁRIO ESPECÍFICO (robertosshbrasil@gmail.com)
-- Mostra todas as informações do usuário de teste
SELECT 
  u.id,
  u.email,
  u.name,
  u.notification_preferences,
  u.created_at,
  COUNT(DISTINCT ft.id) as total_tokens,
  COUNT(DISTINCT n.id) as total_notificacoes,
  COUNT(DISTINCT CASE WHEN n.sent_at IS NOT NULL THEN n.id END) as notificacoes_enviadas
FROM users u
LEFT JOIN fcm_tokens ft ON ft.user_id = u.id
LEFT JOIN notifications n ON n.user_id = u.id
WHERE u.email = 'robertosshbrasil@gmail.com'
GROUP BY u.id, u.email, u.name, u.notification_preferences, u.created_at;

-- Resultado esperado: 
-- - total_tokens >= 1
-- - total_notificacoes > 0
-- - notificacoes_enviadas > 0


-- 10. VERIFICAR ÚLTIMAS ATIVIDADES
-- Timeline de eventos recentes
SELECT 
  'PRODUTO' as tipo,
  id,
  name as descricao,
  status,
  created_at
FROM products
WHERE created_at > NOW() - INTERVAL '7 days'

UNION ALL

SELECT 
  'CUPOM' as tipo,
  id::text,
  code as descricao,
  CASE 
    WHEN is_out_of_stock THEN 'out_of_stock'
    WHEN is_active THEN 'active'
    ELSE 'inactive'
  END as status,
  created_at
FROM coupons
WHERE created_at > NOW() - INTERVAL '7 days'

UNION ALL

SELECT 
  'NOTIFICAÇÃO' as tipo,
  id::text,
  type as descricao,
  CASE WHEN sent_at IS NOT NULL THEN 'sent' ELSE 'pending' END as status,
  created_at
FROM notifications
WHERE created_at > NOW() - INTERVAL '7 days'

ORDER BY created_at DESC
LIMIT 50;

-- Resultado esperado: Timeline mostrando criação de produtos, cupons e notificações


-- ========================================
-- QUERIES DE LIMPEZA (USE COM CUIDADO!)
-- ========================================

-- REMOVER TOKENS FCM INVÁLIDOS (apenas se necessário)
-- DELETE FROM fcm_tokens WHERE created_at < NOW() - INTERVAL '90 days';

-- REMOVER NOTIFICAÇÕES ANTIGAS (apenas se necessário)
-- DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '30 days';

-- RESETAR PREFERÊNCIAS DE NOTIFICAÇÃO DE UM USUÁRIO
-- UPDATE users SET notification_preferences = NULL WHERE email = 'robertosshbrasil@gmail.com';


-- ========================================
-- QUERIES DE TESTE
-- ========================================

-- INSERIR TOKEN FCM DE TESTE (apenas para debug)
-- INSERT INTO fcm_tokens (user_id, fcm_token, platform, device_id)
-- SELECT 
--   id,
--   'TEST_TOKEN_' || id,
--   'android',
--   'TEST_DEVICE_' || id
-- FROM users
-- WHERE email = 'robertosshbrasil@gmail.com';

-- CRIAR NOTIFICAÇÃO DE TESTE
-- INSERT INTO notifications (user_id, title, message, type)
-- SELECT 
--   id,
--   '🔥 Teste de Notificação',
--   'Esta é uma notificação de teste',
--   'test'
-- FROM users
-- WHERE email = 'robertosshbrasil@gmail.com';
