-- Tabela de Configuração de Sincronização
CREATE TABLE IF NOT EXISTS sync_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shopee_enabled BOOLEAN DEFAULT FALSE,
    mercadolivre_enabled BOOLEAN DEFAULT FALSE,
    amazon_enabled BOOLEAN DEFAULT FALSE,
    aliexpress_enabled BOOLEAN DEFAULT FALSE,
    shopee_auto_publish BOOLEAN DEFAULT FALSE,
    mercadolivre_auto_publish BOOLEAN DEFAULT FALSE,
    amazon_auto_publish BOOLEAN DEFAULT FALSE,
    aliexpress_auto_publish BOOLEAN DEFAULT FALSE,
    keywords VARCHAR(1000),
    min_discount_percentage INTEGER DEFAULT 10,
    categories JSONB DEFAULT '[]'::jsonb,
    cron_interval_minutes INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_sync_config_updated_at BEFORE UPDATE ON sync_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas de segurança
ALTER TABLE sync_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin Full Access Sync Config" ON sync_config FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'));
CREATE POLICY "Public Read Sync Config" ON sync_config FOR SELECT USING (TRUE);
