-- =====================================================
-- Migration: Melhorias para Usuários, Categorias e Analytics
-- Data: 13/12/2024
-- =====================================================

-- Adicionar campos faltantes na tabela categories se não existirem
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '📦',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Criar índice único para slug
CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_unique ON categories(slug) WHERE slug IS NOT NULL;

-- Adicionar comentários
COMMENT ON COLUMN categories.slug IS 'Slug único para URL amigável';
COMMENT ON COLUMN categories.description IS 'Descrição da categoria';
COMMENT ON COLUMN categories.icon IS 'Ícone emoji da categoria';
COMMENT ON COLUMN categories.is_active IS 'Indica se a categoria está ativa';

-- Garantir que a tabela click_tracking existe com os campos necessários
-- (Se a tabela não existir, será criada pelo schema principal)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'click_tracking') THEN
    CREATE TABLE click_tracking (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      product_id UUID REFERENCES products(id) ON DELETE CASCADE,
      coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
      clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      converted BOOLEAN DEFAULT false,
      conversion_date TIMESTAMP WITH TIME ZONE
    );

    CREATE INDEX IF NOT EXISTS idx_click_tracking_user_id ON click_tracking(user_id);
    CREATE INDEX IF NOT EXISTS idx_click_tracking_product_id ON click_tracking(product_id);
    CREATE INDEX IF NOT EXISTS idx_click_tracking_clicked_at ON click_tracking(clicked_at);
    CREATE INDEX IF NOT EXISTS idx_click_tracking_converted ON click_tracking(converted);
  END IF;
END $$;

-- Atualizar categorias existentes sem slug para gerar slugs
UPDATE categories
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(name, '[àáâãäå]', 'a', 'gi'),
    '[^a-z0-9]+', '-', 'g'
  )
)
WHERE slug IS NULL OR slug = '';

-- Garantir que não há slugs duplicados
DO $$
DECLARE
  cat RECORD;
  counter INTEGER;
  new_slug TEXT;
BEGIN
  FOR cat IN SELECT id, name FROM categories WHERE slug IS NULL OR slug = '' LOOP
    counter := 1;
    new_slug := LOWER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(cat.name, '[àáâãäå]', 'a', 'gi'),
        '[^a-z0-9]+', '-', 'g'
      )
    );
    
    WHILE EXISTS (SELECT 1 FROM categories WHERE slug = new_slug AND id != cat.id) LOOP
      new_slug := new_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    
    UPDATE categories SET slug = new_slug WHERE id = cat.id;
  END LOOP;
END $$;

