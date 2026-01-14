-- Verificar constraint atual da tabela products
-- Execute no SQL Editor do Supabase

-- 1. Ver definição atual da constraint
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'products_platform_check';

-- 2. Se a constraint ainda estiver com valores antigos, force a recriação:
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_platform_check CASCADE;

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

-- 3. Verificar novamente
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'products_platform_check';

-- Você deve ver todos os 8 valores listados na constraint
