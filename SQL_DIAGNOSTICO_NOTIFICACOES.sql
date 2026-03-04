-- ============================================
-- SQL PARA DIAGNÓSTICO DE NOTIFICAÇÕES PUSH
-- ============================================

-- 1. VERIFICAR USUÁRIOS COM TOKEN FCM
-- ============================================
SELECT 
  id,
  name,
  email,
  fcm_token IS NOT NULL as tem_token,
  SUBSTRING(fcm_token, 1, 50) as token_preview,
  created_at,
  updated_at
FROM users
ORDER BY created_at DESC
LIMIT 20;

-- Estatísticas de tokens
SELECT 
  COUNT(*) as total_usuarios,
  COUNT(fcm_token) as com_token,
  COUNT(*) - COUNT(fcm_token) as sem_token,
  ROUND(COUNT(fcm_token)::numeric / COUNT(*)::numeric * 100, 2) as percentual_com_token
FROM users;


-- 2. VERIFICAR PREFERÊNCIAS DE NOTIFICAÇÃO
-- ============================================
SELECT 
  u.id,
  u.name,
  u.email,
  u.fcm_token IS NOT NULL as tem_token,
  np.push_enabled,
  np.category_preferences,
  np.keyword_preferences,
  np.product_name_preferences
FROM users u
LEFT JOIN notification_preferences np ON u.id = np.user_id
WHERE u.fcm_token IS NOT NULL
ORDER BY u.created_at DESC;

-- Estatísticas de preferências
SELECT 
  COUNT(*) as total_usuarios_com_token,
  COUNT(CASE WHEN np.push_enabled = true THEN 1 END) as push_habilitado,
  COUNT(CASE WHEN np.push_enabled = false THEN 1 END) as push_desabilitado,
  COUNT(CASE WHEN np.push_enabled IS NULL THEN 1 END) as sem_preferencias,
  COUNT(CASE WHEN np.category_preferences IS NOT NULL THEN 1 END) as com_filtro_categoria,
  COUNT(CASE WHEN np.keyword_preferences IS NOT NULL THEN 1 END) as com_filtro_palavras
FROM users u
LEFT JOIN notification_preferences np ON u.id = np.user_id
WHERE u.fcm_token IS NOT NULL;


-- 3. VERIFICAR NOTIFICAÇÕES CRIADAS
-- ============================================
SELECT 
  n.id,
  n.title,
  n.message,
  n.type,
  n.sent_at IS NOT NULL as foi_enviada,
  n.created_at,
  u.name as usuario_nome,
  u.email as usuario_email
FROM notifications n
JOIN users u ON n.user_id = u.id
ORDER BY n.created_at DESC
LIMIT 50;

-- Estatísticas de notificações (últimas 24h)
SELECT 
  type,
  COUNT(*) as total_criadas,
  COUNT(CASE WHEN sent_at IS NOT NULL THEN 1 END) as enviadas,
  COUNT(CASE WHEN sent_at IS NULL THEN 1 END) as nao_enviadas,
  ROUND(
    COUNT(CASE WHEN sent_at IS NOT NULL THEN 1 END)::numeric / 
    COUNT(*)::numeric * 100, 
    2
  ) as taxa_entrega_pct
FROM notifications
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY type
ORDER BY total_criadas DESC;


-- 4. VERIFICAR CUPONS RECENTES
-- ============================================
SELECT 
  id,
  code,
  platform,
  discount_type,
  discount_value,
  is_active,
  is_pending_approval,
  is_out_of_stock,
  created_at
FROM coupons
ORDER BY created_at DESC
LIMIT 20;


-- 5. VERIFICAR PRODUTOS RECENTES
-- ============================================
SELECT 
  id,
  name,
  platform,
  current_price,
  discount_percentage,
  status,
  created_at
FROM products
ORDER BY created_at DESC
LIMIT 20;


-- ============================================
-- QUERIES DE CORREÇÃO
-- ============================================

-- CORREÇÃO 1: Habilitar push para todos os usuários
-- ============================================
-- ATENÇÃO: Isso vai habilitar notificações para TODOS os usuários
-- Executar apenas se tiver certeza

-- Ver quantos serão afetados
SELECT COUNT(*) 
FROM notification_preferences 
WHERE push_enabled = false;

-- Aplicar correção
-- UPDATE notification_preferences 
-- SET push_enabled = true
-- WHERE push_enabled = false;


-- CORREÇÃO 2: Remover filtros de segmentação
-- ============================================
-- ATENÇÃO: Isso vai fazer todos os usuários receberem TODAS as notificações
-- Executar apenas se tiver certeza

-- Ver quantos têm filtros
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN category_preferences IS NOT NULL THEN 1 END) as com_categoria,
  COUNT(CASE WHEN keyword_preferences IS NOT NULL THEN 1 END) as com_palavras,
  COUNT(CASE WHEN product_name_preferences IS NOT NULL THEN 1 END) as com_produtos
FROM notification_preferences;

-- Aplicar correção
-- UPDATE notification_preferences 
-- SET 
--   category_preferences = NULL,
--   keyword_preferences = NULL,
--   product_name_preferences = NULL;


-- CORREÇÃO 3: Limpar tokens FCM antigos (expirados)
-- ============================================
-- Tokens FCM expiram após 60 dias de inatividade
-- Usuários precisarão reabrir o app para registrar novo token

-- Ver quantos tokens antigos existem
SELECT COUNT(*) 
FROM users 
WHERE fcm_token IS NOT NULL 
  AND updated_at < NOW() - INTERVAL '60 days';

-- Aplicar correção
-- UPDATE users 
-- SET fcm_token = NULL 
-- WHERE fcm_token IS NOT NULL 
--   AND updated_at < NOW() - INTERVAL '60 days';


-- CORREÇÃO 4: Criar preferências padrão para usuários sem preferências
-- ============================================
-- Isso garante que usuários sem preferências recebam notificações

-- Ver quantos usuários não têm preferências
SELECT COUNT(*) 
FROM users u
LEFT JOIN notification_preferences np ON u.id = np.user_id
WHERE u.fcm_token IS NOT NULL 
  AND np.id IS NULL;

-- Aplicar correção
-- INSERT INTO notification_preferences (user_id, push_enabled, created_at, updated_at)
-- SELECT 
--   u.id,
--   true,
--   NOW(),
--   NOW()
-- FROM users u
-- LEFT JOIN notification_preferences np ON u.id = np.user_id
-- WHERE u.fcm_token IS NOT NULL 
--   AND np.id IS NULL;


-- ============================================
-- QUERIES DE MONITORAMENTO
-- ============================================

-- MONITORAMENTO 1: Taxa de entrega de notificações (tempo real)
-- ============================================
SELECT 
  DATE_TRUNC('hour', created_at) as hora,
  type,
  COUNT(*) as total,
  COUNT(CASE WHEN sent_at IS NOT NULL THEN 1 END) as enviadas,
  ROUND(
    COUNT(CASE WHEN sent_at IS NOT NULL THEN 1 END)::numeric / 
    COUNT(*)::numeric * 100, 
    2
  ) as taxa_pct
FROM notifications
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at), type
ORDER BY hora DESC, type;


-- MONITORAMENTO 2: Usuários mais ativos (recebem mais notificações)
-- ============================================
SELECT 
  u.id,
  u.name,
  u.email,
  COUNT(n.id) as total_notificacoes,
  COUNT(CASE WHEN n.sent_at IS NOT NULL THEN 1 END) as enviadas,
  COUNT(CASE WHEN n.sent_at IS NULL THEN 1 END) as nao_enviadas
FROM users u
JOIN notifications n ON u.id = n.user_id
WHERE n.created_at >= NOW() - INTERVAL '7 days'
GROUP BY u.id, u.name, u.email
ORDER BY total_notificacoes DESC
LIMIT 20;


-- MONITORAMENTO 3: Cupons que geraram mais notificações
-- ============================================
SELECT 
  c.id,
  c.code,
  c.platform,
  COUNT(n.id) as total_notificacoes,
  COUNT(CASE WHEN n.sent_at IS NOT NULL THEN 1 END) as enviadas
FROM coupons c
LEFT JOIN notifications n ON c.id = n.related_coupon_id
WHERE c.created_at >= NOW() - INTERVAL '7 days'
GROUP BY c.id, c.code, c.platform
ORDER BY total_notificacoes DESC
LIMIT 20;


-- MONITORAMENTO 4: Produtos que geraram mais notificações
-- ============================================
SELECT 
  p.id,
  p.name,
  p.platform,
  COUNT(n.id) as total_notificacoes,
  COUNT(CASE WHEN n.sent_at IS NOT NULL THEN 1 END) as enviadas
FROM products p
LEFT JOIN notifications n ON p.id = n.related_product_id
WHERE p.created_at >= NOW() - INTERVAL '7 days'
GROUP BY p.id, p.name, p.platform
ORDER BY total_notificacoes DESC
LIMIT 20;


-- ============================================
-- QUERIES DE LIMPEZA
-- ============================================

-- LIMPEZA 1: Remover notificações antigas (mais de 30 dias)
-- ============================================
-- ATENÇÃO: Isso vai DELETAR notificações antigas permanentemente

-- Ver quantas serão removidas
SELECT COUNT(*) 
FROM notifications 
WHERE created_at < NOW() - INTERVAL '30 days';

-- Aplicar limpeza
-- DELETE FROM notifications 
-- WHERE created_at < NOW() - INTERVAL '30 days';


-- LIMPEZA 2: Remover tokens FCM de usuários inativos (mais de 90 dias)
-- ============================================
-- ATENÇÃO: Usuários precisarão reabrir o app para registrar novo token

-- Ver quantos serão afetados
SELECT COUNT(*) 
FROM users 
WHERE fcm_token IS NOT NULL 
  AND updated_at < NOW() - INTERVAL '90 days';

-- Aplicar limpeza
-- UPDATE users 
-- SET fcm_token = NULL 
-- WHERE fcm_token IS NOT NULL 
--   AND updated_at < NOW() - INTERVAL '90 days';


-- ============================================
-- QUERIES DE TESTE
-- ============================================

-- TESTE 1: Simular segmentação para um cupom específico
-- ============================================
-- Substitua 'CODIGO_DO_CUPOM' pelo código real
WITH cupom AS (
  SELECT * FROM coupons WHERE code = 'CODIGO_DO_CUPOM'
),
usuarios_com_token AS (
  SELECT u.*, np.*
  FROM users u
  LEFT JOIN notification_preferences np ON u.id = np.user_id
  WHERE u.fcm_token IS NOT NULL
)
SELECT 
  id,
  name,
  email,
  push_enabled,
  category_preferences,
  keyword_preferences,
  CASE 
    WHEN push_enabled IS NULL THEN 'Sem preferências (recebe tudo)'
    WHEN push_enabled = false THEN 'Push desabilitado'
    WHEN category_preferences IS NULL AND keyword_preferences IS NULL THEN 'Sem filtros (recebe tudo)'
    ELSE 'Com filtros (verificar match)'
  END as status_segmentacao
FROM usuarios_com_token;


-- TESTE 2: Verificar última notificação de cada usuário
-- ============================================
SELECT DISTINCT ON (u.id)
  u.id,
  u.name,
  u.email,
  n.title,
  n.type,
  n.sent_at IS NOT NULL as foi_enviada,
  n.created_at as data_notificacao
FROM users u
LEFT JOIN notifications n ON u.id = n.user_id
WHERE u.fcm_token IS NOT NULL
ORDER BY u.id, n.created_at DESC;


-- ============================================
-- QUERIES DE DIAGNÓSTICO AVANÇADO
-- ============================================

-- DIAGNÓSTICO 1: Identificar usuários que nunca receberam notificação
-- ============================================
SELECT 
  u.id,
  u.name,
  u.email,
  u.fcm_token IS NOT NULL as tem_token,
  u.created_at as data_cadastro,
  COUNT(n.id) as total_notificacoes
FROM users u
LEFT JOIN notifications n ON u.id = n.user_id
WHERE u.fcm_token IS NOT NULL
GROUP BY u.id, u.name, u.email, u.fcm_token, u.created_at
HAVING COUNT(n.id) = 0
ORDER BY u.created_at DESC;


-- DIAGNÓSTICO 2: Identificar notificações que falharam consistentemente
-- ============================================
SELECT 
  type,
  title,
  COUNT(*) as total_tentativas,
  COUNT(CASE WHEN sent_at IS NULL THEN 1 END) as falhas,
  ROUND(
    COUNT(CASE WHEN sent_at IS NULL THEN 1 END)::numeric / 
    COUNT(*)::numeric * 100, 
    2
  ) as taxa_falha_pct
FROM notifications
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY type, title
HAVING COUNT(CASE WHEN sent_at IS NULL THEN 1 END) > 0
ORDER BY taxa_falha_pct DESC;


-- DIAGNÓSTICO 3: Verificar configuração do sistema
-- ============================================
SELECT 
  key,
  value,
  updated_at
FROM app_settings
WHERE key IN (
  'backend_url',
  'fcm_enabled',
  'notify_bots_on_new_coupon',
  'notify_bots_on_new_product'
);
