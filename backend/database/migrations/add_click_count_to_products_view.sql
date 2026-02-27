-- Adicionar contagem de cliques à view products_full
-- Esta migração atualiza a view para incluir o click_count

-- Primeiro, dropar a view existente se ela existir
DROP VIEW IF EXISTS products_full CASCADE;

-- Recriar a view com click_count
CREATE OR REPLACE VIEW products_full AS
SELECT 
  p.*,
  c.name as category_name,
  c.icon as category_icon,
  c.color as category_color,
  cp.code as coupon_code,
  cp.discount_value as coupon_discount_value,
  cp.discount_type as coupon_discount_type,
  cp.title as coupon_title,
  cp.is_out_of_stock as coupon_is_out_of_stock,
  -- Contar cliques do produto
  (SELECT COUNT(*) FROM click_tracking ct WHERE ct.product_id = p.id) as click_count
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN coupons cp ON p.coupon_id = cp.id;

-- Comentário explicativo
COMMENT ON VIEW products_full IS 'View completa de produtos com categoria, cupom e contagem de cliques';
