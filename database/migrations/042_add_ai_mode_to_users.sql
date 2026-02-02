-- Adiciona coluna para persistir o estado do modo IA do usuário
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_mode_active BOOLEAN DEFAULT FALSE;
