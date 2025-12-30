-- Migration: 011_add_notification_preferences_theme.sql
-- Adicionar preferências de notificação e tema escuro

-- Adicionar coluna para tema escuro
ALTER TABLE users
ADD COLUMN IF NOT EXISTS dark_mode BOOLEAN DEFAULT FALSE;

-- Criar tabela de preferências de notificação
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Preferências gerais
  push_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT FALSE,
  
  -- Preferências por categoria
  category_preferences JSONB DEFAULT '[]'::jsonb, -- Array de category_ids
  
  -- Preferências por palavra-chave
  keyword_preferences JSONB DEFAULT '[]'::jsonb, -- Array de palavras-chave
  
  -- Preferências por nome de produto
  product_name_preferences JSONB DEFAULT '[]'::jsonb, -- Array de nomes de produtos
  
  -- Filtros de produtos para tela inicial
  home_filters JSONB DEFAULT '{
    "platforms": [],
    "categories": [],
    "min_discount": 0,
    "max_price": null,
    "only_with_coupon": false
  }'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_push_enabled ON notification_preferences(push_enabled) WHERE push_enabled = TRUE;

-- Comentários
COMMENT ON TABLE notification_preferences IS 'Preferências de notificação e filtros do usuário';
COMMENT ON COLUMN notification_preferences.category_preferences IS 'Array de IDs de categorias para receber notificações';
COMMENT ON COLUMN notification_preferences.keyword_preferences IS 'Array de palavras-chave para filtrar notificações';
COMMENT ON COLUMN notification_preferences.product_name_preferences IS 'Array de nomes de produtos para receber notificações';
COMMENT ON COLUMN notification_preferences.home_filters IS 'Filtros para produtos na tela inicial';
COMMENT ON COLUMN users.dark_mode IS 'Tema escuro ativado pelo usuário';

