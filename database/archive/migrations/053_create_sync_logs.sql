-- Criação da tabela sync_logs que está faltando
-- Necessária para o funcionamento do histórico e estatísticas de sincronização automática

CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform VARCHAR(50) NOT NULL,
    product_name VARCHAR(500),
    product_id UUID,
    discount_percentage INTEGER,
    is_new_product BOOLEAN DEFAULT FALSE,
    sent_to_bots BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance nas consultas de histórico e estatísticas
CREATE INDEX IF NOT EXISTS idx_sync_logs_platform ON sync_logs(platform);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_logs_is_new_product ON sync_logs(is_new_product);

-- Políticas de segurança (RLS)
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin Full Access Sync Logs" ON sync_logs
    FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'));

-- Permissão de leitura pública (ou autenticada) se necessário para o dashboard visual
CREATE POLICY "Authenticated Read Sync Logs" ON sync_logs
    FOR SELECT
    USING (auth.role() = 'authenticated');
