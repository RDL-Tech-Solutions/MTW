-- =====================================================
-- ANÁLISE DE MIGRAÇÕES vs SCHEMA ATUAL
-- Data: 2026-01-06
-- =====================================================

-- ✅ VERIFICAÇÕES PASSADAS (Já estão no schema):
-- 001: bot_channels, bot_config - ✅
-- 007: max_discount_value - ✅ (CORRIGIDO)
-- 013: default categories - ✅
-- 018: app_settings - ✅
-- 038: AI improvements (offer_score, canonical_product_id, ai_*) - ✅
-- 039: bot_segmentation (category_filter, platform_filter, bot_send_logs) - ✅
-- 042: valid_until nullable - ✅
-- 052: products_full view - ✅

-- =====================================================
-- ❌ ITEMS FALTANDO NO SCHEMA (Precisam ser adicionados):
-- =====================================================

-- 1. BOT_CHANNELS: Faltam campos da migration 040
--    - only_coupons BOOLEAN
--    - max_notifications_per_day INTEGER
--    - content_filter_keywords TEXT
--    - exclude_keywords TEXT
--    - min_discount_percentage_filter INTEGER

-- Verifica se os campos existem
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bot_channels' AND column_name = 'only_coupons')
        THEN '✅ only_coupons exists'
        ELSE '❌ only_coupons MISSING'
    END,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bot_channels' AND column_name = 'max_notifications_per_day')
        THEN '✅ max_notifications_per_day exists'
        ELSE '❌ max_notifications_per_day MISSING'
    END,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bot_channels' AND column_name = 'content_filter_keywords')
        THEN '✅ content_filter_keywords exists'
        ELSE '❌ content_filter_keywords MISSING'
    END,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bot_channels' AND column_name = 'exclude_keywords')
        THEN '✅ exclude_keywords exists'
        ELSE '❌ exclude_keywords MISSING'
    END,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bot_channels' AND column_name = 'min_discount_percentage_filter')
        THEN '✅ min_discount_percentage_filter exists'
        ELSE '❌ min_discount_percentage_filter MISSING'
    END;

-- 2. BOT_CHANNELS: content_filter (campo JSONB para controlar se envia products/coupons)
--    Migration 040 menciona isso
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bot_channels' AND column_name = 'content_filter')
        THEN '✅ content_filter exists'
        ELSE '❌ content_filter MISSING (should be JSONB with products/coupons flags)'
    END;

-- 3. SYNC_CONFIG: auto_publish (campo geral)
--    Migration 044 adiciona auto_publish antes dos específicos por plataforma
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sync_config' AND column_name = 'auto_publish')
        THEN '✅ auto_publish exists'
        ELSE '❌ auto_publish MISSING'
    END;

-- 4. Verificar indexes que podem estar faltando
SELECT 
    schemaname, 
    tablename, 
    indexname 
FROM pg_indexes 
WHERE tablename IN ('bot_channels', 'coupons', 'products', 'sync_config')
ORDER BY tablename, indexname;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- Se algum campo retornar ❌ MISSING, precisa ser adicionado ao schema
