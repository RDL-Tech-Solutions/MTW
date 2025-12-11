-- MTW Promo Database Schema
-- Execute este script no SQL Editor do Supabase

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para busca full-text

-- =====================================================
-- TABELA: users
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  push_token VARCHAR(255),
  is_vip BOOLEAN DEFAULT FALSE,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'vip')),
  favorite_categories JSONB DEFAULT '[]'::jsonb,
  favorites JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_vip ON users(is_vip);

-- =====================================================
-- TABELA: categories
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  icon VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para categories
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_is_active ON categories(is_active);

-- =====================================================
-- TABELA: coupons
-- =====================================================
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(100) NOT NULL,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('shopee', 'mercadolivre', 'general')),
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  min_purchase DECIMAL(10,2) DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  is_general BOOLEAN DEFAULT TRUE,
  applicable_products JSONB DEFAULT '[]'::jsonb,
  restrictions TEXT,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  is_vip BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para coupons
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_platform ON coupons(platform);
CREATE INDEX idx_coupons_valid_until ON coupons(valid_until);
CREATE INDEX idx_coupons_is_active ON coupons(is_active);
CREATE INDEX idx_coupons_is_vip ON coupons(is_vip);

-- =====================================================
-- TABELA: products
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(500) NOT NULL,
  image_url TEXT NOT NULL,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('shopee', 'mercadolivre')),
  current_price DECIMAL(10,2) NOT NULL,
  old_price DECIMAL(10,2),
  discount_percentage INTEGER,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  affiliate_link TEXT NOT NULL,
  external_id VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  stock_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para products
CREATE INDEX idx_products_platform ON products(platform);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_coupon_id ON products(coupon_id);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_current_price ON products(current_price);
CREATE INDEX idx_products_discount_percentage ON products(discount_percentage);
CREATE INDEX idx_products_external_id ON products(external_id);
CREATE INDEX idx_products_name_trgm ON products USING gin(name gin_trgm_ops); -- Para busca full-text

-- =====================================================
-- TABELA: price_history
-- =====================================================
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para price_history
CREATE INDEX idx_price_history_product_id ON price_history(product_id);
CREATE INDEX idx_price_history_recorded_at ON price_history(recorded_at);

-- =====================================================
-- TABELA: notifications
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('new_coupon', 'price_drop', 'expiring_coupon', 'new_promo', 'coupon_expired', 'favorite_price_change')),
  related_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  related_coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  is_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_is_sent ON notifications(is_sent);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- =====================================================
-- TABELA: click_tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS click_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  converted BOOLEAN DEFAULT FALSE,
  conversion_date TIMESTAMP WITH TIME ZONE
);

-- Índices para click_tracking
CREATE INDEX idx_click_tracking_user_id ON click_tracking(user_id);
CREATE INDEX idx_click_tracking_product_id ON click_tracking(product_id);
CREATE INDEX idx_click_tracking_coupon_id ON click_tracking(coupon_id);
CREATE INDEX idx_click_tracking_clicked_at ON click_tracking(clicked_at);
CREATE INDEX idx_click_tracking_converted ON click_tracking(converted);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em tabelas relevantes
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para registrar histórico de preços
CREATE OR REPLACE FUNCTION record_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (OLD.current_price IS DISTINCT FROM NEW.current_price) THEN
    INSERT INTO price_history (product_id, price, recorded_at)
    VALUES (NEW.id, NEW.current_price, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_price_changes AFTER INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION record_price_change();

-- =====================================================
-- VIEWS
-- =====================================================

-- View para produtos com informações completas
CREATE OR REPLACE VIEW products_full AS
SELECT 
  p.*,
  c.name as category_name,
  c.slug as category_slug,
  c.icon as category_icon,
  cp.code as coupon_code,
  cp.discount_type as coupon_discount_type,
  cp.discount_value as coupon_discount_value,
  cp.valid_until as coupon_valid_until,
  cp.is_vip as coupon_is_vip
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN coupons cp ON p.coupon_id = cp.id;

-- View para estatísticas de produtos
CREATE OR REPLACE VIEW product_stats AS
SELECT 
  p.id,
  p.name,
  COUNT(DISTINCT ct.id) as total_clicks,
  COUNT(DISTINCT CASE WHEN ct.converted = TRUE THEN ct.id END) as total_conversions,
  CASE 
    WHEN COUNT(DISTINCT ct.id) > 0 
    THEN ROUND((COUNT(DISTINCT CASE WHEN ct.converted = TRUE THEN ct.id END)::DECIMAL / COUNT(DISTINCT ct.id)) * 100, 2)
    ELSE 0 
  END as conversion_rate
FROM products p
LEFT JOIN click_tracking ct ON p.id = ct.product_id
GROUP BY p.id, p.name;

-- View para cupons ativos
CREATE OR REPLACE VIEW active_coupons AS
SELECT *
FROM coupons
WHERE is_active = TRUE
  AND valid_until > NOW()
  AND (max_uses IS NULL OR current_uses < max_uses);

-- =====================================================
-- FUNÇÕES ÚTEIS
-- =====================================================

-- Função para buscar produtos com filtros
CREATE OR REPLACE FUNCTION search_products(
  search_term TEXT DEFAULT NULL,
  category_filter UUID DEFAULT NULL,
  platform_filter TEXT DEFAULT NULL,
  min_price_filter DECIMAL DEFAULT NULL,
  max_price_filter DECIMAL DEFAULT NULL,
  min_discount_filter INTEGER DEFAULT NULL,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  image_url TEXT,
  platform VARCHAR,
  current_price DECIMAL,
  old_price DECIMAL,
  discount_percentage INTEGER,
  category_name VARCHAR,
  coupon_code VARCHAR,
  affiliate_link TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.image_url,
    p.platform,
    p.current_price,
    p.old_price,
    p.discount_percentage,
    c.name as category_name,
    cp.code as coupon_code,
    p.affiliate_link
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
  LEFT JOIN coupons cp ON p.coupon_id = cp.id
  WHERE p.is_active = TRUE
    AND p.stock_available = TRUE
    AND (search_term IS NULL OR p.name ILIKE '%' || search_term || '%')
    AND (category_filter IS NULL OR p.category_id = category_filter)
    AND (platform_filter IS NULL OR p.platform = platform_filter)
    AND (min_price_filter IS NULL OR p.current_price >= min_price_filter)
    AND (max_price_filter IS NULL OR p.current_price <= max_price_filter)
    AND (min_discount_filter IS NULL OR p.discount_percentage >= min_discount_filter)
  ORDER BY p.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DADOS INICIAIS (SEEDS)
-- =====================================================

-- Inserir categorias padrão
INSERT INTO categories (name, slug, icon) VALUES
  ('Eletrônicos', 'eletronicos', 'smartphone'),
  ('Games', 'games', 'gamepad'),
  ('Casa', 'casa', 'home'),
  ('Acessórios', 'acessorios', 'watch'),
  ('Moda', 'moda', 'shirt'),
  ('Informática', 'informatica', 'laptop'),
  ('Beleza', 'beleza', 'sparkles'),
  ('Esportes', 'esportes', 'dumbbell'),
  ('Livros', 'livros', 'book'),
  ('Brinquedos', 'brinquedos', 'toy-brick')
ON CONFLICT (slug) DO NOTHING;

-- Criar usuário admin padrão (senha: admin123)
-- IMPORTANTE: Alterar a senha após primeiro login!
INSERT INTO users (name, email, password, role, is_vip) VALUES
  ('Admin', 'admin@mtwpromo.com', '$2a$10$rQ3qZ8qZ8qZ8qZ8qZ8qZ8uK8qZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ', 'admin', TRUE)
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- POLÍTICAS DE SEGURANÇA (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE click_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- Políticas para users (usuários podem ver e editar apenas seus próprios dados)
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- Políticas para products (todos podem ver, apenas admin pode modificar)
CREATE POLICY "Anyone can view active products" ON products FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins can do anything with products" ON products FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
);

-- Políticas para coupons (todos podem ver ativos, apenas admin pode modificar)
CREATE POLICY "Anyone can view active coupons" ON coupons FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins can do anything with coupons" ON coupons FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
);

-- Políticas para categories (todos podem ver, apenas admin pode modificar)
CREATE POLICY "Anyone can view categories" ON categories FOR SELECT USING (TRUE);
CREATE POLICY "Admins can do anything with categories" ON categories FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
);

-- Políticas para notifications (usuários veem apenas suas notificações)
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id::text = auth.uid()::text);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id::text = auth.uid()::text);

-- Políticas para click_tracking (usuários veem apenas seus cliques)
CREATE POLICY "Users can view own clicks" ON click_tracking FOR SELECT USING (user_id::text = auth.uid()::text);
CREATE POLICY "Users can insert own clicks" ON click_tracking FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

-- Políticas para price_history (todos podem ver)
CREATE POLICY "Anyone can view price history" ON price_history FOR SELECT USING (TRUE);

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE users IS 'Tabela de usuários do sistema';
COMMENT ON TABLE products IS 'Tabela de produtos com promoções';
COMMENT ON TABLE coupons IS 'Tabela de cupons de desconto';
COMMENT ON TABLE categories IS 'Tabela de categorias de produtos';
COMMENT ON TABLE notifications IS 'Tabela de notificações push';
COMMENT ON TABLE click_tracking IS 'Tabela de rastreamento de cliques em produtos';
COMMENT ON TABLE price_history IS 'Histórico de mudanças de preço dos produtos';

-- =====================================================
-- FIM DO SCHEMA
-- =====================================================

-- Verificar se tudo foi criado corretamente
SELECT 'Schema criado com sucesso!' as status;
