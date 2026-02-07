-- =====================================================
-- Migration: Add Realtime Mode to Capture Mode
-- Data: 2026-01-08
-- Descrição: Atualiza constraint para aceitar modo 'realtime'
-- =====================================================

-- Remover constraint antiga
ALTER TABLE telegram_channels 
DROP CONSTRAINT IF EXISTS telegram_channels_capture_mode_check;

-- Adicionar nova constraint com modo 'realtime'
ALTER TABLE telegram_channels
ADD CONSTRAINT telegram_channels_capture_mode_check 
CHECK (capture_mode IN ('realtime', 'new_only', '1_day', '2_days'));

-- Verificar se a migração foi aplicada
SELECT 'Migration 040_add_realtime_capture_mode.sql aplicada com sucesso!' as status;
