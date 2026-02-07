-- Adicionar tabela para status dos modelos de IA
CREATE TABLE IF NOT EXISTS ai_model_status (
    model_id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(20) DEFAULT 'unknown', -- 'online', 'offline', 'error'
    last_tested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    error_message TEXT,
    latency_ms INTEGER
);

-- Adicionar índice para data de teste
CREATE INDEX IF NOT EXISTS idx_ai_model_status_last_tested ON ai_model_status(last_tested_at);
