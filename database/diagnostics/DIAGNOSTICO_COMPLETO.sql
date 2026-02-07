-- ============================================================================
-- DIAGNÓSTICO COMPLETO: Problema de Constraint
-- ============================================================================
-- Execute cada seção SEPARADAMENTE para diagnosticar o problema
-- ============================================================================

-- ============================================================================
-- SEÇÃO 1: VERIFICAR CONSTRAINT ATUAL
-- ============================================================================

SELECT 
  conname AS nome_constraint,
  pg_get_constraintdef(oid) AS definicao_completa
FROM pg_constraint
WHERE conrelid = 'products'::regclass
  AND contype = 'c'  -- Check constraints
  AND conname LIKE '%platform%';

-- 👆 COPIE O RESULTADO E ME ENVIE
-- Deve mostrar a definição EXATA da constraint

-- ============================================================================
-- SEÇÃO 2: VERIFICAR ESTRUTURA DA TABELA
-- ============================================================================

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name = 'platform';

-- 👆 Deve mostrar: platform | character varying | NO | ...

-- ============================================================================
-- SEÇÃO 3: TESTAR INSERÇÃO MANUAL
-- ============================================================================

-- TESTE 1: Tentar inserir com 'kabum' (DEVE FUNCIONAR)
BEGIN;

INSERT INTO products (
  name,
  platform,
  current_price,
  status,
  external_id,
  affiliate_link
) VALUES (
  'TESTE KABUM - DELETAR',
  'kabum',  -- ← Valor que deveria funcionar
  99.99,
  'pending',
  'test-kabum-' || extract(epoch from now()),
  'https://www.kabum.com.br/test'
);

-- Se der ERRO aqui, a constraint NÃO foi atualizada
-- Se funcionar, o problema está no código backend

ROLLBACK;  -- Desfaz o teste

-- ============================================================================
-- SEÇÃO 4: VERIFICAR SE EXISTEM MÚLTIPLAS CONSTRAINTS
-- ============================================================================

SELECT 
  conname,
  pg_get_constraintdef(oid) as definicao
FROM pg_constraint
WHERE conrelid = 'products'::regclass
  AND contype = 'c'
ORDER BY conname;

-- 👆 Pode haver constraints duplicadas causando conflito

-- ============================================================================
-- SEÇÃO 5: FORÇAR RECRIAÇÃO (SE NADA ANTERIOR FUNCIONOU)
-- ============================================================================

-- ⚠️ EXECUTE APENAS SE AS SEÇÕES ANTERIORES NÃO RESOLVERAM

-- Passo 1: Remover TODAS as constraints relacionadas a platform
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'products'::regclass 
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%platform%'
    LOOP
        EXECUTE 'ALTER TABLE products DROP CONSTRAINT IF EXISTS ' || constraint_name || ' CASCADE';
        RAISE NOTICE 'Removida constraint: %', constraint_name;
    END LOOP;
END $$;

-- Passo 2: Criar constraint fresh
ALTER TABLE products 
ADD CONSTRAINT products_platform_check 
CHECK (platform IN (
  'mercadolivre'::text,
  'shopee'::text,
  'amazon'::text,
  'aliexpress'::text,
  'kabum'::text,
  'magazineluiza'::text,
  'terabyteshop'::text,
  'general'::text
));

-- Passo 3: Verificar
SELECT 
  conname,
  pg_get_constraintdef(oid) as definicao
FROM pg_constraint
WHERE conname = 'products_platform_check';

-- ============================================================================
-- SEÇÃO 6: TESTE FINAL
-- ============================================================================

-- Testar cada plataforma nova
BEGIN;

-- Teste Kabum
INSERT INTO products (name, platform, current_price, status, external_id, affiliate_link)
VALUES ('TESTE1', 'kabum', 99, 'pending', 'test1', 'http://test.com');

-- Teste Magazine Luiza
INSERT INTO products (name, platform, current_price, status, external_id, affiliate_link)
VALUES ('TESTE2', 'magazineluiza', 99, 'pending', 'test2', 'http://test.com');

-- Teste Terabyteshop
INSERT INTO products (name, platform, current_price, status, external_id, affiliate_link)
VALUES ('TESTE3', 'terabyteshop', 99, 'pending', 'test3', 'http://test.com');

-- Se chegou aqui sem erro: SUCESSO! ✅
-- Agora desfaça os testes:
ROLLBACK;

-- ============================================================================
-- RESULTADO ESPERADO
-- ============================================================================
-- Todos os INSERTs devem funcionar sem erro
-- Se der erro, copie a mensagem COMPLETA e me envie
-- ============================================================================
