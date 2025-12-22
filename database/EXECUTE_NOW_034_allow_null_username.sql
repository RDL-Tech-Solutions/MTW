-- =====================================================
-- EXECUTE ESTE SQL NO SUPABASE SQL EDITOR AGORA
-- Permite criar canais privados sem username
-- =====================================================

-- 1. Remover constraint UNIQUE de username (para permitir múltiplos NULLs)
DROP INDEX IF EXISTS idx_telegram_channels_username;

-- Remover constraint UNIQUE se existir
DO $$
BEGIN
    -- Verificar se existe constraint UNIQUE em username
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'telegram_channels' 
        AND constraint_name LIKE '%username%'
        AND constraint_type = 'UNIQUE'
    ) THEN
        -- Remover constraint UNIQUE
        ALTER TABLE telegram_channels 
        DROP CONSTRAINT IF EXISTS telegram_channels_username_key;
    END IF;
END $$;

-- 2. Alterar username para permitir NULL
ALTER TABLE telegram_channels 
ALTER COLUMN username DROP NOT NULL;

-- 3. Criar índice parcial único para username (apenas quando não for NULL)
-- Isso garante que usernames sejam únicos, mas permite múltiplos NULLs
CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_channels_username_unique 
ON telegram_channels(username) 
WHERE username IS NOT NULL;

-- 4. Criar constraint CHECK para garantir que pelo menos um dos dois seja fornecido
-- (username OU channel_id deve ser NOT NULL)
ALTER TABLE telegram_channels 
DROP CONSTRAINT IF EXISTS telegram_channels_username_or_channel_id_check;

ALTER TABLE telegram_channels 
ADD CONSTRAINT telegram_channels_username_or_channel_id_check 
CHECK (username IS NOT NULL OR channel_id IS NOT NULL);

-- 5. Criar índice único para channel_id (quando não for NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_channels_channel_id_unique 
ON telegram_channels(channel_id) 
WHERE channel_id IS NOT NULL;

-- 6. Recriar índice normal para username (para buscas)
CREATE INDEX IF NOT EXISTS idx_telegram_channels_username 
ON telegram_channels(username) 
WHERE username IS NOT NULL;

-- Comentários atualizados
COMMENT ON COLUMN telegram_channels.username IS 'Username do canal público (sem @). NULL para canais privados que usam apenas channel_id.';
COMMENT ON COLUMN telegram_channels.channel_id IS 'ID do canal no Telegram (ex: -1001234567890). Obrigatório para canais privados, opcional para canais públicos.';

-- ============================================
-- ✅ Migration concluída!
-- ============================================
-- Agora é possível criar canais privados usando apenas channel_id
-- ou canais públicos usando apenas username
-- ============================================




