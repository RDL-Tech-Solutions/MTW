-- Migration: Adicionar campo example_messages para mensagens padrão do canal
-- Data: 2025-12-19
-- Descrição: Permite armazenar mensagens de exemplo que o canal envia para melhorar a captura de cupons pela IA

-- Adicionar coluna example_messages (JSONB para armazenar array de mensagens)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'telegram_channels' 
        AND column_name = 'example_messages'
    ) THEN
        ALTER TABLE telegram_channels 
        ADD COLUMN example_messages JSONB DEFAULT '[]'::jsonb;
        
        COMMENT ON COLUMN telegram_channels.example_messages IS 'Array de mensagens de exemplo que o canal envia. Usado pela IA para melhorar a captura de cupons analisando padrões de mensagem.';
    END IF;
END $$;

-- Criar índice GIN para buscas eficientes em JSONB
CREATE INDEX IF NOT EXISTS idx_telegram_channels_example_messages 
ON telegram_channels USING GIN (example_messages);

-- ============================================
-- ✅ Migration concluída!
-- ============================================
-- Agora é possível armazenar mensagens de exemplo por canal
-- para melhorar a precisão da IA na captura de cupons
-- ============================================


