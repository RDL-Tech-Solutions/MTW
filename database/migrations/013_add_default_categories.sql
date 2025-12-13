-- Migration: 013_add_default_categories.sql
-- Adicionar categorias padrão fixas no sistema

-- Categorias padrão conforme especificado
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

-- Comentário
COMMENT ON TABLE categories IS 'Categorias padrão fixas do sistema';

