-- =====================================================
-- EXECUTAR AGORA: Melhorias de IA e Automação Inteligente
-- Data: 2024-12-20
-- IMPORTANTE: Execute este arquivo no SQL Editor do Supabase
-- =====================================================

-- =====================================================
-- PARTE 1: Migration 038 - Melhorias de IA
-- =====================================================

-- CUPONS: Campos de IA e Confiança
ALTER TABLE coupons
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 0.0
  CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0);

ALTER TABLE coupons
ADD COLUMN IF NOT EXISTS ai_decision_reason TEXT;

ALTER TABLE coupons
ADD COLUMN IF NOT EXISTS ai_edit_history JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_coupons_confidence_score ON coupons(confidence_score);
CREATE INDEX IF NOT EXISTS idx_coupons_ai_decision ON coupons(confidence_score, is_pending_approval);

-- PRODUTOS: Campos de IA, Score e Duplicados
ALTER TABLE products
ADD COLUMN IF NOT EXISTS offer_score DECIMAL(5,2) DEFAULT 0.0
  CHECK (offer_score >= 0.0 AND offer_score <= 100.0);

ALTER TABLE products
ADD COLUMN IF NOT EXISTS canonical_product_id UUID REFERENCES products(id) ON DELETE SET NULL;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS offer_priority VARCHAR(10) DEFAULT 'medium'
  CHECK (offer_priority IN ('low', 'medium', 'high'));

ALTER TABLE products
ADD COLUMN IF NOT EXISTS ai_optimized_title VARCHAR(500);

ALTER TABLE products
ADD COLUMN IF NOT EXISTS ai_generated_description TEXT;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS ai_detected_category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS ai_decision_reason TEXT;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS ai_edit_history JSONB DEFAULT '[]'::jsonb;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS should_send_push BOOLEAN DEFAULT FALSE;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS should_send_to_bots BOOLEAN DEFAULT TRUE;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS is_featured_offer BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_products_offer_score ON products(offer_score);
CREATE INDEX IF NOT EXISTS idx_products_canonical_id ON products(canonical_product_id);
CREATE INDEX IF NOT EXISTS idx_products_priority ON products(offer_priority);
CREATE INDEX IF NOT EXISTS idx_products_ai_category ON products(ai_detected_category_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured_offer, status);

-- TABELA: ai_decision_logs
CREATE TABLE IF NOT EXISTS ai_decision_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('coupon', 'product')),
  entity_id UUID NOT NULL,
  decision_type VARCHAR(50) NOT NULL,
  confidence_score DECIMAL(3,2),
  decision_reason TEXT,
  input_data JSONB,
  output_data JSONB,
  model_used VARCHAR(100),
  processing_time_ms INTEGER,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_entity ON ai_decision_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_decision_type ON ai_decision_logs(decision_type);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_decision_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_logs_success ON ai_decision_logs(success);

-- TABELA: product_duplicates
CREATE TABLE IF NOT EXISTS product_duplicates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canonical_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  duplicate_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  similarity_score DECIMAL(5,2) DEFAULT 0.0
    CHECK (similarity_score >= 0.0 AND similarity_score <= 100.0),
  detection_method VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(canonical_product_id, duplicate_product_id)
);

CREATE INDEX IF NOT EXISTS idx_duplicates_canonical ON product_duplicates(canonical_product_id);
CREATE INDEX IF NOT EXISTS idx_duplicates_duplicate ON product_duplicates(duplicate_product_id);
CREATE INDEX IF NOT EXISTS idx_duplicates_similarity ON product_duplicates(similarity_score);

-- APP_SETTINGS: Configurações de IA
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_settings' 
    AND column_name = 'ai_auto_publish_confidence_threshold'
  ) THEN
    ALTER TABLE app_settings
    ADD COLUMN ai_auto_publish_confidence_threshold DECIMAL(3,2) DEFAULT 0.90
      CHECK (ai_auto_publish_confidence_threshold >= 0.0 AND ai_auto_publish_confidence_threshold <= 1.0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_settings' 
    AND column_name = 'ai_enable_auto_publish'
  ) THEN
    ALTER TABLE app_settings
    ADD COLUMN ai_enable_auto_publish BOOLEAN DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_settings' 
    AND column_name = 'ai_enable_product_editing'
  ) THEN
    ALTER TABLE app_settings
    ADD COLUMN ai_enable_product_editing BOOLEAN DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_settings' 
    AND column_name = 'ai_enable_duplicate_detection'
  ) THEN
    ALTER TABLE app_settings
    ADD COLUMN ai_enable_duplicate_detection BOOLEAN DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_settings' 
    AND column_name = 'ai_enable_quality_scoring'
  ) THEN
    ALTER TABLE app_settings
    ADD COLUMN ai_enable_quality_scoring BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- =====================================================
-- PARTE 2: Migration 039 - Segmentação de Bots
-- =====================================================

-- Adicionar campos de segmentação aos bot_channels
ALTER TABLE bot_channels
ADD COLUMN IF NOT EXISTS category_filter JSONB DEFAULT '[]'::jsonb;

ALTER TABLE bot_channels
ADD COLUMN IF NOT EXISTS platform_filter JSONB DEFAULT '[]'::jsonb;

ALTER TABLE bot_channels
ADD COLUMN IF NOT EXISTS schedule_start TIME;

ALTER TABLE bot_channels
ADD COLUMN IF NOT EXISTS schedule_end TIME;

ALTER TABLE bot_channels
ADD COLUMN IF NOT EXISTS min_offer_score DECIMAL(5,2) DEFAULT 0.0;

ALTER TABLE bot_channels
ADD COLUMN IF NOT EXISTS avoid_duplicates_hours INTEGER DEFAULT 24;

CREATE INDEX IF NOT EXISTS idx_bot_channels_category_filter ON bot_channels USING GIN (category_filter);
CREATE INDEX IF NOT EXISTS idx_bot_channels_platform_filter ON bot_channels USING GIN (platform_filter);

-- TABELA: bot_send_logs
CREATE TABLE IF NOT EXISTS bot_send_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES bot_channels(id) ON DELETE CASCADE,
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('product', 'coupon')),
  entity_id UUID NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(channel_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_bot_send_logs_channel ON bot_send_logs(channel_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_bot_send_logs_entity ON bot_send_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_bot_send_logs_sent_at ON bot_send_logs(sent_at);

-- Função para limpar logs antigos
CREATE OR REPLACE FUNCTION cleanup_old_bot_send_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM bot_send_logs
  WHERE sent_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTE 3: Atualizar Configurações Padrão
-- =====================================================

UPDATE app_settings
SET 
  ai_auto_publish_confidence_threshold = 0.90,
  ai_enable_auto_publish = true,
  ai_enable_product_editing = true,
  ai_enable_duplicate_detection = true,
  ai_enable_quality_scoring = true
WHERE id = '00000000-0000-0000-0000-000000000001';

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON COLUMN coupons.confidence_score IS 'Score de confiança da IA na extração (0.0 a 1.0). >= 0.90 = publicação automática';
COMMENT ON COLUMN coupons.ai_decision_reason IS 'Motivo da decisão da IA (por que foi aprovado/rejeitado)';
COMMENT ON COLUMN coupons.ai_edit_history IS 'Histórico de edições feitas pela IA';

COMMENT ON COLUMN products.offer_score IS 'Score de qualidade da oferta (0.0 a 100.0)';
COMMENT ON COLUMN products.canonical_product_id IS 'ID do produto canônico (primeiro produto encontrado)';
COMMENT ON COLUMN products.offer_priority IS 'Prioridade da oferta: low, medium, high';
COMMENT ON COLUMN products.ai_optimized_title IS 'Título reescrito pela IA';
COMMENT ON COLUMN products.ai_generated_description IS 'Descrição padronizada gerada pela IA';
COMMENT ON COLUMN products.ai_detected_category_id IS 'Categoria detectada automaticamente pela IA';

COMMENT ON TABLE ai_decision_logs IS 'Logs de decisões da IA para observabilidade e rastreabilidade';
COMMENT ON TABLE product_duplicates IS 'Relações de produtos duplicados detectados pela IA';
COMMENT ON TABLE bot_send_logs IS 'Logs de envios de bots para controle de duplicação';
