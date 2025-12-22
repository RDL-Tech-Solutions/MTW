-- =====================================================
-- Migration: Melhorias de IA e Automação Inteligente
-- Data: 2024-12-20
-- Descrição: Adiciona campos para IA, scores de qualidade, detecção de duplicados e observabilidade
-- =====================================================

-- =====================================================
-- CUPONS: Campos de IA e Confiança
-- =====================================================

-- Adicionar confidence_score aos cupons
ALTER TABLE coupons
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 0.0
  CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0);

-- Adicionar motivo da decisão da IA
ALTER TABLE coupons
ADD COLUMN IF NOT EXISTS ai_decision_reason TEXT;

-- Adicionar histórico de edições da IA (JSON)
ALTER TABLE coupons
ADD COLUMN IF NOT EXISTS ai_edit_history JSONB DEFAULT '[]'::jsonb;

-- Índices para cupons
CREATE INDEX IF NOT EXISTS idx_coupons_confidence_score ON coupons(confidence_score);
CREATE INDEX IF NOT EXISTS idx_coupons_ai_decision ON coupons(confidence_score, is_pending_approval);

-- =====================================================
-- PRODUTOS: Campos de IA, Score e Duplicados
-- =====================================================

-- Adicionar offer_score (score de qualidade da oferta)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS offer_score DECIMAL(5,2) DEFAULT 0.0
  CHECK (offer_score >= 0.0 AND offer_score <= 100.0);

-- Adicionar canonical_product_id (para detecção de duplicados)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS canonical_product_id UUID REFERENCES products(id) ON DELETE SET NULL;

-- Adicionar prioridade da oferta (baixa, média, alta)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS offer_priority VARCHAR(10) DEFAULT 'medium'
  CHECK (offer_priority IN ('low', 'medium', 'high'));

-- Adicionar título otimizado pela IA
ALTER TABLE products
ADD COLUMN IF NOT EXISTS ai_optimized_title VARCHAR(500);

-- Adicionar descrição gerada pela IA
ALTER TABLE products
ADD COLUMN IF NOT EXISTS ai_generated_description TEXT;

-- Adicionar categoria detectada pela IA
ALTER TABLE products
ADD COLUMN IF NOT EXISTS ai_detected_category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Adicionar motivo da decisão da IA
ALTER TABLE products
ADD COLUMN IF NOT EXISTS ai_decision_reason TEXT;

-- Adicionar histórico de edições da IA (JSON)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS ai_edit_history JSONB DEFAULT '[]'::jsonb;

-- Adicionar flags de publicação automática
ALTER TABLE products
ADD COLUMN IF NOT EXISTS should_send_push BOOLEAN DEFAULT FALSE;
ALTER TABLE products
ADD COLUMN IF NOT EXISTS should_send_to_bots BOOLEAN DEFAULT TRUE;
ALTER TABLE products
ADD COLUMN IF NOT EXISTS is_featured_offer BOOLEAN DEFAULT FALSE; -- "Oferta do Dia"

-- Índices para produtos
CREATE INDEX IF NOT EXISTS idx_products_offer_score ON products(offer_score);
CREATE INDEX IF NOT EXISTS idx_products_canonical_id ON products(canonical_product_id);
CREATE INDEX IF NOT EXISTS idx_products_priority ON products(offer_priority);
CREATE INDEX IF NOT EXISTS idx_products_ai_category ON products(ai_detected_category_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured_offer, status);

-- =====================================================
-- TABELA: ai_decision_logs (Observabilidade)
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_decision_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('coupon', 'product')),
  entity_id UUID NOT NULL,
  decision_type VARCHAR(50) NOT NULL, -- 'extraction', 'publication', 'editing', 'scoring', 'duplicate_detection'
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

-- Índices para logs de decisão
CREATE INDEX IF NOT EXISTS idx_ai_logs_entity ON ai_decision_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_decision_type ON ai_decision_logs(decision_type);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_decision_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_logs_success ON ai_decision_logs(success);

-- =====================================================
-- TABELA: product_duplicates (Detecção de Duplicados)
-- =====================================================

CREATE TABLE IF NOT EXISTS product_duplicates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canonical_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  duplicate_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  similarity_score DECIMAL(5,2) DEFAULT 0.0
    CHECK (similarity_score >= 0.0 AND similarity_score <= 100.0),
  detection_method VARCHAR(50), -- 'ai', 'name_similarity', 'external_id'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(canonical_product_id, duplicate_product_id)
);

-- Índices para duplicados
CREATE INDEX IF NOT EXISTS idx_duplicates_canonical ON product_duplicates(canonical_product_id);
CREATE INDEX IF NOT EXISTS idx_duplicates_duplicate ON product_duplicates(duplicate_product_id);
CREATE INDEX IF NOT EXISTS idx_duplicates_similarity ON product_duplicates(similarity_score);

-- =====================================================
-- ATUALIZAR APP_SETTINGS: Configurações de IA
-- =====================================================

-- Adicionar configurações de IA se não existirem
DO $$
BEGIN
  -- Verificar se já existe a coluna
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
-- COMENTÁRIOS
-- =====================================================

COMMENT ON COLUMN coupons.confidence_score IS 'Score de confiança da IA na extração (0.0 a 1.0). >= 0.90 = publicação automática';
COMMENT ON COLUMN coupons.ai_decision_reason IS 'Motivo da decisão da IA (por que foi aprovado/rejeitado)';
COMMENT ON COLUMN coupons.ai_edit_history IS 'Histórico de edições feitas pela IA (array de objetos com timestamp, campo, valor_antigo, valor_novo)';

COMMENT ON COLUMN products.offer_score IS 'Score de qualidade da oferta (0.0 a 100.0). Baseado em desconto, histórico, popularidade, CTR, confiança IA';
COMMENT ON COLUMN products.canonical_product_id IS 'ID do produto canônico (primeiro produto encontrado). Produtos duplicados apontam para o mesmo canonical';
COMMENT ON COLUMN products.offer_priority IS 'Prioridade da oferta: low, medium, high. Define ordem no feed e push notifications';
COMMENT ON COLUMN products.ai_optimized_title IS 'Título reescrito pela IA (curto, chamativo, sem emojis excessivos)';
COMMENT ON COLUMN products.ai_generated_description IS 'Descrição padronizada gerada pela IA';
COMMENT ON COLUMN products.ai_detected_category_id IS 'Categoria detectada automaticamente pela IA';
COMMENT ON COLUMN products.should_send_push IS 'Se deve enviar push notification (decisão da IA)';
COMMENT ON COLUMN products.should_send_to_bots IS 'Se deve enviar para bots (decisão da IA)';
COMMENT ON COLUMN products.is_featured_offer IS 'Se é "Oferta do Dia" (decisão da IA)';


