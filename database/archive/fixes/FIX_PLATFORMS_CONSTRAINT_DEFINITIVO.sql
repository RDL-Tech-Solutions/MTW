-- ============================================================================
-- SCRIPT DEFINITIVO: Corrigir Constraint de Plataformas
-- ============================================================================
-- Execute este script COMPLETO no SQL Editor do Supabase
-- ============================================================================

-- PASSO 1: Verificar constraint atual
SELECT 
  conname AS nome_constraint,
  pg_get_constraintdef(oid) AS definicao
FROM pg_constraint
WHERE conname = 'products_platform_check';

-- RESULTADO ESPERADO:
-- Se aparecer apenas: 'mercadolivre', 'shopee', 'amazon', 'aliexpress', 'general'
-- Então a constraint está DESATUALIZADA e precisa ser corrigida abaixo.

-- ============================================================================

-- PASSO 2: REMOVER constraint antiga (FORÇADO)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_platform_check CASCADE;

-- ============================================================================

-- PASSO 3: CRIAR constraint nova com TODAS as 8 plataformas
ALTER TABLE products 
ADD CONSTRAINT products_platform_check 
CHECK (platform IN (
  'mercadolivre',
  'shopee', 
  'amazon',
  'aliexpress',
  'kabum',
  'magazineluiza',
  'terabyteshop',
  'general'
));

-- ============================================================================

-- PASSO 4: Adicionar comentário
COMMENT ON CONSTRAINT products_platform_check ON products 
IS 'Permite 8 plataformas: 4 antigas + 3 novas (kabum, magazineluiza, terabyteshop) + general';

-- ============================================================================

-- PASSO 5: VERIFICAR se funcionou
SELECT 
  conname AS nome_constraint,
  pg_get_constraintdef(oid) AS definicao
FROM pg_constraint
WHERE conname = 'products_platform_check';

-- RESULTADO ESPERADO AGORA:
-- Deve mostrar CHECK com os 8 valores:
-- 'mercadolivre', 'shopee', 'amazon', 'aliexpress', 
-- 'kabum', 'magazineluiza', 'terabyteshop', 'general'

-- ============================================================================

-- PASSO 6 (OPCIONAL): Testar se aceita os novos valores
-- Descomentar as linhas abaixo para testar:

-- SELECT 'kabum' = ANY(ARRAY['mercadolivre', 'shopee', 'amazon', 'aliexpress', 'kabum', 'magazineluiza', 'terabyteshop', 'general']::text[]);
-- SELECT 'magazineluiza' = ANY(ARRAY['mercadolivre', 'shopee', 'amazon', 'aliexpress', 'kabum', 'magazineluiza', 'terabyteshop', 'general']::text[]);
-- SELECT 'terabyteshop' = ANY(ARRAY['mercadolivre', 'shopee', 'amazon', 'aliexpress', 'kabum', 'magazineluiza', 'terabyteshop', 'general']::text[]);

-- Todos devem retornar: true

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
