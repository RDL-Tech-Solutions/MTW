-- Script para garantir que as categorias padrão existam
-- Execute este script no Supabase SQL Editor

-- Garantir que a coluna description existe
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;

-- Garantir que a coluna is_active existe
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Inserir ou atualizar categorias padrão
INSERT INTO categories (name, slug, icon, description, is_active) VALUES
  ('Acessórios', 'acessorios', '⌚', 'Acessórios diversos', true),
  ('Beleza', 'beleza', '💄', 'Produtos de beleza e cuidados pessoais', true),
  ('Brinquedos', 'brinquedos', '🧸', 'Brinquedos e jogos infantis', true),
  ('Casa', 'casa', '🏠', 'Produtos para casa e decoração', true),
  ('Eletrônicos', 'eletronicos', '📱', 'Eletrônicos e gadgets', true),
  ('Esporte', 'esporte', '⚽', 'Artigos esportivos', true),
  ('Games', 'games', '🎮', 'Jogos e consoles', true),
  ('Informática', 'informatica', '💻', 'Computadores e periféricos', true),
  ('Livros', 'livros', '📚', 'Livros e materiais de leitura', true),
  ('Moda', 'moda', '👕', 'Roupas e acessórios de moda', true)
ON CONFLICT (slug) DO UPDATE
SET 
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- Verificar se as categorias foram inseridas
SELECT name, slug, icon, is_active FROM categories ORDER BY name;

