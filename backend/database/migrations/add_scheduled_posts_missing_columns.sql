-- Migration: Adicionar colunas faltantes na tabela scheduled_posts
-- Data: 2026-03-07
-- Descrição: Adiciona colunas processing_started_at e metadata que são usadas no código mas faltam no schema

-- 1. Adicionar coluna processing_started_at (usada para detectar posts travados)
ALTER TABLE scheduled_posts 
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE;

-- 2. Adicionar coluna metadata (usada para salvar categoria manual e outras opções)
ALTER TABLE scheduled_posts 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 3. Adicionar índice composto otimizado para buscar posts travados
-- Query: status='processing' AND processing_started_at < (now - 5 minutes)
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_processing_stuck 
ON scheduled_posts(status, processing_started_at) 
WHERE status = 'processing';

-- 4. Melhorar índice existente para incluir platform (usado nos filtros)
DROP INDEX IF EXISTS idx_scheduled_posts_status_scheduled_at;
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status_platform_scheduled 
ON scheduled_posts(status, platform, scheduled_at);

-- 5. Adicionar comentários nas colunas para documentação
COMMENT ON COLUMN scheduled_posts.processing_started_at IS 'Timestamp de quando o post começou a ser processado (usado para detectar posts travados)';
COMMENT ON COLUMN scheduled_posts.metadata IS 'Dados adicionais do agendamento (categoria manual, opções de publicação, etc.)';
COMMENT ON COLUMN scheduled_posts.attempts IS 'Número de tentativas de publicação (máximo 3)';
COMMENT ON COLUMN scheduled_posts.platform IS 'Plataforma de destino: telegram, whatsapp, mercadolivre, shopee, aliexpress';
COMMENT ON COLUMN scheduled_posts.status IS 'Status do agendamento: pending (aguardando), processing (processando), published (publicado), failed (falhou)';

-- 6. Adicionar constraint para validar status
ALTER TABLE scheduled_posts 
DROP CONSTRAINT IF EXISTS scheduled_posts_status_check;

ALTER TABLE scheduled_posts 
ADD CONSTRAINT scheduled_posts_status_check 
CHECK (status IN ('pending', 'processing', 'published', 'failed'));

-- 7. Adicionar constraint para validar attempts
ALTER TABLE scheduled_posts 
DROP CONSTRAINT IF EXISTS scheduled_posts_attempts_check;

ALTER TABLE scheduled_posts 
ADD CONSTRAINT scheduled_posts_attempts_check 
CHECK (attempts >= 0 AND attempts <= 3);

-- 8. Limpar posts travados existentes (se houver)
-- Retornar para pending posts que estão em processing há mais de 5 minutos
UPDATE scheduled_posts 
SET 
    status = 'pending',
    processing_started_at = NULL,
    updated_at = NOW()
WHERE 
    status = 'processing' 
    AND processing_started_at < (NOW() - INTERVAL '5 minutes')
    AND attempts < 3;

-- Marcar como failed posts que já tentaram 3 vezes
UPDATE scheduled_posts 
SET 
    status = 'failed',
    error_message = 'Timeout após múltiplas tentativas (recuperado pela migration)',
    processing_started_at = NULL,
    updated_at = NOW()
WHERE 
    status = 'processing' 
    AND processing_started_at < (NOW() - INTERVAL '5 minutes')
    AND attempts >= 3;

-- 9. Exibir estatísticas após migration
DO $$
DECLARE
    total_posts INTEGER;
    pending_posts INTEGER;
    processing_posts INTEGER;
    published_posts INTEGER;
    failed_posts INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_posts FROM scheduled_posts;
    SELECT COUNT(*) INTO pending_posts FROM scheduled_posts WHERE status = 'pending';
    SELECT COUNT(*) INTO processing_posts FROM scheduled_posts WHERE status = 'processing';
    SELECT COUNT(*) INTO published_posts FROM scheduled_posts WHERE status = 'published';
    SELECT COUNT(*) INTO failed_posts FROM scheduled_posts WHERE status = 'failed';
    
    RAISE NOTICE '✅ Migration concluída com sucesso!';
    RAISE NOTICE '📊 Estatísticas da tabela scheduled_posts:';
    RAISE NOTICE '   Total: %', total_posts;
    RAISE NOTICE '   Pending: %', pending_posts;
    RAISE NOTICE '   Processing: %', processing_posts;
    RAISE NOTICE '   Published: %', published_posts;
    RAISE NOTICE '   Failed: %', failed_posts;
END $$;
