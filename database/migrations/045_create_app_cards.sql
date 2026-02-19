-- Migration: 045_create_app_cards
-- Tabela de cards promocionais do app

CREATE TABLE IF NOT EXISTS app_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT,
  background_color TEXT DEFAULT '#DC2626',
  text_color TEXT DEFAULT '#FFFFFF',
  action_type TEXT NOT NULL DEFAULT 'link' CHECK (action_type IN ('link', 'product_list', 'coupon_list', 'screen')),
  action_value TEXT,
  product_ids UUID[] DEFAULT '{}',
  position INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_app_cards_active ON app_cards (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_app_cards_position ON app_cards (position ASC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_app_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_app_cards_updated_at
  BEFORE UPDATE ON app_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_app_cards_updated_at();

-- Inserir cards de exemplo
INSERT INTO app_cards (title, subtitle, background_color, action_type, action_value, position) VALUES
  ('OFERTAS DO DIA', 'Até 70% OFF nos melhores produtos', '#DC2626', 'screen', 'Coupons', 0),
  ('CUPONS EXCLUSIVOS', 'Descubra cupons de desconto', '#7C3AED', 'screen', 'Coupons', 1);
