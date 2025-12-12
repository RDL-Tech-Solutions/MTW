-- ============================================
-- Tabela de Configuração de Sincronização
-- ============================================
CREATE TABLE IF NOT EXISTS sync_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopee_enabled BOOLEAN DEFAULT false,
  mercadolivre_enabled BOOLEAN DEFAULT false,
  keywords TEXT DEFAULT '',
  min_discount_percentage INTEGER DEFAULT 10,
  categories JSONB DEFAULT '[]'::jsonb,
  cron_interval_minutes INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- Tabela de Logs de Sincronização
-- ============================================
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('shopee', 'mercadolivre')),
  product_name VARCHAR(500) NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  discount_percentage INTEGER NOT NULL,
  is_new_product BOOLEAN DEFAULT true,
  sent_to_bots BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- Índices para Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_sync_logs_platform ON sync_logs(platform);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_is_new_product ON sync_logs(is_new_product);
CREATE INDEX IF NOT EXISTS idx_sync_logs_product_id ON sync_logs(product_id);

-- ============================================
-- Comentários
-- ============================================
COMMENT ON TABLE sync_config IS 'Configurações para sincronização automática de produtos';
COMMENT ON TABLE sync_logs IS 'Histórico de sincronizações de produtos';

-- ============================================
-- RLS (Row Level Security) - Opcional
-- ============================================
-- ALTER TABLE sync_config ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Inserir configuração padrão se não existir
INSERT INTO sync_config (
  shopee_enabled,
  mercadolivre_enabled,
  keywords,
  min_discount_percentage,
  cron_interval_minutes,
  is_active
) 
SELECT false, false, '', 10, 60, false
WHERE NOT EXISTS (SELECT 1 FROM sync_config LIMIT 1);
