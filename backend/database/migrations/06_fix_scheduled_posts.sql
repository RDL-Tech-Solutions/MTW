-- Migration: Fix Scheduled Posts Processing
-- Adiciona colunas necessárias para controle de processamento e timeout

-- 1. Adicionar coluna metadata para armazenar opções de publicação (categoria manual, etc)
ALTER TABLE scheduled_posts 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 2. Adicionar coluna para controle de timeout
ALTER TABLE scheduled_posts 
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE;

-- 3. Atualizar comentário do status para incluir 'processing'
COMMENT ON COLUMN scheduled_posts.status IS 'Status do agendamento: pending, processing, published, failed';

-- 4. Criar índice para otimizar busca de posts travados em processamento
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_processing_timeout 
ON scheduled_posts(status, processing_started_at) 
WHERE status = 'processing';

-- 5. Adicionar índice para buscar posts pendentes prontos para processar
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_pending_ready 
ON scheduled_posts(status, scheduled_at) 
WHERE status = 'pending';
