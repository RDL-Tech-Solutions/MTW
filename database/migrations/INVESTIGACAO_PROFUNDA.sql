-- ============================================================================
-- INVESTIGAÇÃO PROFUNDA: Por que constraint AINDA falha?
-- ============================================================================

-- EXECUTE CADA QUERY E ME ENVIE O RESULTADO

-- ============================================================================
-- QUERY 1: Ver TODAS as constraints na tabela products
-- ============================================================================

SELECT 
    c.conname AS constraint_name,
    c.contype AS constraint_type,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'products'
ORDER BY c.conname;

-- 👆 COPIE TODO O RESULTADO E ME ENVIE

-- ============================================================================
-- QUERY 2: Verificar especificamente constraints com 'platform' no nome
-- ============================================================================

SELECT 
    conname,
    contype,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'products'::regclass
  AND (conname LIKE '%platform%' OR pg_get_constraintdef(oid) LIKE '%platform%')
ORDER BY conname;

-- 👆 Pode haver MÚLTIPLAS constraints

-- ============================================================================ 
-- QUERY 3: Ver o schema COMPLETO da tabela products
-- ============================================================================

SELECT
    a.attname AS column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
    a.attnotnull AS not_null,
    COALESCE(pg_catalog.pg_get_expr(d.adbin, d.adrelid), '') AS default_value,
    col_description(a.attrelid, a.attnum) AS comment
FROM pg_catalog.pg_attribute a
LEFT JOIN pg_catalog.pg_attrdef d ON (a.attrelid, a.attnum) = (d.adrelid, d.adnum)
WHERE a.attrelid = 'products'::regclass
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY a.attnum;

-- 👆 Ver se column platform tem tipo correto

-- ============================================================================
-- SOLUÇÃO FORÇADA: Remover TODAS as constraints relacionadas a platform
-- ============================================================================

-- ⚠️ EXECUTE ISSO SE AS QUERIES ACIMA MOSTRAREM MÚLTIPLAS CONSTRAINTS

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Remover todas as constraints que mencionam 'platform'
    FOR r IN 
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'products'::regclass
          AND contype = 'c'
          AND (conname LIKE '%platform%' OR pg_get_constraintdef(oid) LIKE '%platform%')
    LOOP
        EXECUTE format('ALTER TABLE products DROP CONSTRAINT %I CASCADE', r.conname);
        RAISE NOTICE 'Removida constraint: %', r.conname;
    END LOOP;
END $$;

-- ============================================================================
-- Criar constraint FRESH com nome ÚNICO
-- ============================================================================

ALTER TABLE products 
ADD CONSTRAINT products_platform_enum_check_v2 
CHECK (platform::text = ANY (
    ARRAY[
        'mercadolivre'::text,
        'shopee'::text,
        'amazon'::text,
        'aliexpress'::text,
        'kabum'::text,
        'magazineluiza'::text,
        'terabyteshop'::text,
        'general'::text
    ]
));

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Ver constraint criada
SELECT 
    conname,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'products'::regclass
  AND conname = 'products_platform_enum_check_v2';

-- Deve mostrar CHECK com os 8 valores

-- ============================================================================
-- TESTE DIRETO NO POSTGRES
-- ============================================================================

-- Teste se aceita 'kabum'
SELECT 'kabum'::text = ANY (
    ARRAY[
        'mercadolivre'::text,
        'shopee'::text,
        'amazon'::text,
        'aliexpress'::text,
        'kabum'::text,
        'magazineluiza'::text,
        'terabyteshop'::text,
        'general'::text
    ]
);

-- Deve retornar: true

-- ============================================================================
-- DEPOIS DISSO: Reinicie o backend Node.js para limpar cache de conexões
-- ============================================================================
