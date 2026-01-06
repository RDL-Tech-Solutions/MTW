-- =====================================================
-- Migration: Rename max_discount to max_discount_value in coupons table
-- Data: 2026-01-06
-- Descrição: Renomeia a coluna max_discount para max_discount_value
-- para consistência com migration 007 e código da aplicação
-- =====================================================

-- Verificar se a coluna max_discount existe e max_discount_value não existe
DO $$
BEGIN
  -- Se max_discount existe e max_discount_value não existe, renomear
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'coupons' AND column_name = 'max_discount')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'coupons' AND column_name = 'max_discount_value')
  THEN
    ALTER TABLE coupons RENAME COLUMN max_discount TO max_discount_value;
    RAISE NOTICE 'Coluna max_discount renomeada para max_discount_value com sucesso!';
  
  -- Se max_discount_value já existe, não fazer nada
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'coupons' AND column_name = 'max_discount_value')
  THEN
    RAISE NOTICE 'Coluna max_discount_value já existe. Nenhuma alteração necessária.';
  
  -- Se max_discount não existe e max_discount_value também não, criar max_discount_value
  ELSE
    ALTER TABLE coupons ADD COLUMN IF NOT EXISTS max_discount_value DECIMAL(10,2) DEFAULT NULL;
    RAISE NOTICE 'Coluna max_discount_value criada com sucesso!';
  END IF;
END $$;

-- Comentário
COMMENT ON COLUMN coupons.max_discount_value IS 'Valor máximo de desconto que pode ser aplicado (ex: R$ 60 máximo, mesmo que o desconto seja maior)';

-- Verificar resultado
SELECT 'Migration aplicada com sucesso! Campo max_discount_value está disponível.' as status;
