-- Adicionar campos de agendamento e pausa no telegram_collector_config
ALTER TABLE telegram_collector_config 
ADD COLUMN IF NOT EXISTS is_automatic_mode BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS schedule_start TIME DEFAULT '08:00',
ADD COLUMN IF NOT EXISTS schedule_end TIME DEFAULT '22:00',
ADD COLUMN IF NOT EXISTS work_duration INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS pause_duration INTEGER DEFAULT 5;

COMMENT ON COLUMN telegram_collector_config.is_automatic_mode IS 'Habilita o modo de agendamento automático do listener';
COMMENT ON COLUMN telegram_collector_config.schedule_start IS 'Horário de início da captura diária';
COMMENT ON COLUMN telegram_collector_config.schedule_end IS 'Horário de término da captura diária';
COMMENT ON COLUMN telegram_collector_config.work_duration IS 'Tempo de trabalho ativo em minutos em cada ciclo';
COMMENT ON COLUMN telegram_collector_config.pause_duration IS 'Tempo de pausa em minutos entre ciclos de trabalho';
