-- 1. Adicionar colunas de configuração de encurtador na tabela sync_config
ALTER TABLE sync_config 
ADD COLUMN IF NOT EXISTS shopee_shorten_link BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mercadolivre_shorten_link BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS amazon_shorten_link BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS aliexpress_shorten_link BOOLEAN DEFAULT FALSE;

-- 2. Criar tabela de posts agendados
CREATE TABLE IF NOT EXISTS scheduled_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id),
    platform VARCHAR(50) NOT NULL, -- 'telegram', 'whatsapp'
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'published', 'failed'
    attempts INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Índices para performance do cron job
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status_scheduled_at ON scheduled_posts(status, scheduled_at);
