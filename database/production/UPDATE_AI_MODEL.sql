-- =====================================================
-- MTW Promo - Atualização de Modelo de IA (GRATUITO)
-- Data: 2026-01-07
-- =====================================================
-- 
-- Este script atualiza a configuração do modelo de IA para
-- o modelo GRATUITO recomendado: google/gemini-flash-1.5
--
-- =====================================================
-- MODELOS DISPONÍVEIS
-- =====================================================
-- 
-- GRATUITOS (com suporte JSON):
-- ┌─────────────────────────────────────┬───────────────────────────────────────┐
-- │ Modelo                              │ Descrição                             │
-- ├─────────────────────────────────────┼───────────────────────────────────────┤
-- │ google/gemini-flash-1.5 ⭐ PADRÃO   │ Melhor opção gratuita, suporta JSON   │
-- │ mistralai/mixtral-8x7b-instruct     │ Gratuito, contexto 32K                │
-- └─────────────────────────────────────┴───────────────────────────────────────┘
--
-- PAGOS (melhor qualidade):
-- ┌─────────────────────────────────────┬───────────────────────────────────────┐
-- │ Modelo                              │ Descrição                             │
-- ├─────────────────────────────────────┼───────────────────────────────────────┤
-- │ openai/gpt-4o-mini                  │ Melhor custo-benefício pago           │
-- │ anthropic/claude-3-haiku            │ Rápido e econômico                    │
-- │ anthropic/claude-3.5-sonnet         │ Excelente para templates              │
-- │ openai/gpt-4o                       │ Máxima qualidade                      │
-- └─────────────────────────────────────┴───────────────────────────────────────┘
--
-- MODELOS REMOVIDOS (NÃO SUPORTAM JSON - causam erros):
-- ❌ mistralai/mistral-7b-instruct
-- ❌ meta-llama/llama-3-8b-instruct
-- ❌ gryphe/mythomax-l2-13b
-- ❌ qwen/qwen-2.5-7b-instruct
--
-- =====================================================

-- =====================================================
-- 1. ATUALIZAR PARA MODELO GRATUITO RECOMENDADO
-- =====================================================

UPDATE app_settings 
SET 
    openrouter_model = 'google/gemini-flash-1.5',
    openrouter_enabled = TRUE,
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001';

-- =====================================================
-- 2. VERIFICAR CONFIGURAÇÃO ATUAL
-- =====================================================

SELECT 
    '=== CONFIGURAÇÃO DE IA ===' as "Info",
    CASE WHEN openrouter_api_key IS NOT NULL AND openrouter_api_key != '' 
         THEN '✅ Configurada' 
         ELSE '❌ Não configurada' 
    END as "API Key",
    openrouter_model as "Modelo Atual",
    CASE WHEN openrouter_enabled THEN '✅ Habilitada' ELSE '❌ Desabilitada' END as "IA",
    ai_auto_publish_confidence_threshold as "Threshold"
FROM app_settings 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- =====================================================
-- 3. VERIFICAR CONFIGURAÇÃO DE TEMPLATES
-- =====================================================

SELECT 
    '=== TEMPLATES ===' as "Info",
    template_mode_promotion as "Promoção",
    template_mode_promotion_coupon as "Promo+Cupom",
    template_mode_coupon as "Cupom",
    template_mode_expired_coupon as "Expirado"
FROM app_settings 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- =====================================================
-- OPÇÕES ALTERNATIVAS (descomente para usar)
-- =====================================================

-- OPÇÃO A: Usar modelo PAGO (melhor custo-benefício)
-- UPDATE app_settings 
-- SET openrouter_model = 'openai/gpt-4o-mini'
-- WHERE id = '00000000-0000-0000-0000-000000000001';

-- OPÇÃO B: Usar outro modelo gratuito
-- UPDATE app_settings 
-- SET openrouter_model = 'mistralai/mixtral-8x7b-instruct'
-- WHERE id = '00000000-0000-0000-0000-000000000001';

-- OPÇÃO C: Configurar templates para usar IA Advanced
-- UPDATE app_settings 
-- SET 
--     template_mode_promotion = 'ai_advanced',
--     template_mode_promotion_coupon = 'ai_advanced',
--     template_mode_coupon = 'ai_advanced'
-- WHERE id = '00000000-0000-0000-0000-000000000001';

-- OPÇÃO D: Ajustar threshold de confiança (0.70 = 70%)
-- UPDATE app_settings 
-- SET ai_auto_publish_confidence_threshold = 0.70
-- WHERE id = '00000000-0000-0000-0000-000000000001';
