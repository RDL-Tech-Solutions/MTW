-- =====================================================
-- SCRIPT DE VALIDAÇÃO COMPLETA DO SCHEMA
-- Execute este script no Supabase para validar tudo
-- =====================================================

-- 1. VERIFICAR TODAS AS TABELAS PRINCIPAIS
SELECT 
    'TABLES CHECK' as check_type,
    CASE 
        WHEN COUNT(*) >= 22 THEN '✅ PASS - ' || COUNT(*) || ' tables found'
        ELSE '❌ FAIL - Only ' || COUNT(*) || ' tables found, expected at least 22'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'users', 'categories', 'products', 'coupons', 'price_history',
    'bot_config', 'bot_channels', 'bot_message_templates', 'bot_send_logs',
    'telegram_channels', 'telegram_collector_config',
    'sync_config', 'sync_logs', 'coupon_sync_logs', 'coupon_settings',
    'app_settings', 'notification_preferences', 'notification_logs',
    'ai_decision_logs', 'product_duplicates', 'click_tracking', 'notifications'
  );

-- 2. VERIFICAR CAMPO CRÍTICO: max_discount_value
SELECT 
    'max_discount_value' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'coupons' AND column_name = 'max_discount_value'
        ) THEN '✅ PASS - Column exists in coupons table'
        ELSE '❌ FAIL - Column missing! Run 02_fix_max_discount_column.sql'
    END as status;

-- 3. VERIFICAR CAMPOS DE IA EM PRODUCTS
SELECT 
    'Products AI Fields' as check_type,
    CASE 
        WHEN COUNT(*) >= 9 THEN '✅ PASS - ' || COUNT(*) || ' AI fields present'
        ELSE '❌ FAIL - Missing AI fields in products'
    END as status
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name IN (
    'offer_score', 'canonical_product_id', 'offer_priority',
    'ai_optimized_title', 'ai_generated_description', 'ai_detected_category_id',
    'ai_decision_reason', 'ai_edit_history', 'is_featured_offer'
  );

-- 4. VERIFICAR CAMPOS DE IA EM COUPONS
SELECT 
    'Coupons AI Fields' as check_type,
    CASE 
        WHEN COUNT(*) >= 3 THEN '✅ PASS - ' || COUNT(*) || ' AI fields present'
        ELSE '❌ FAIL - Missing AI fields in coupons'
    END as status
FROM information_schema.columns 
WHERE table_name = 'coupons' 
  AND column_name IN (
    'confidence_score', 'ai_decision_reason', 'ai_edit_history'
  );

-- 5. VERIFICAR CAMPOS DE SEGMENTAÇÃO EM BOT_CHANNELS
SELECT 
    'Bot Channels Segmentation' as check_type,
    CASE 
        WHEN COUNT(*) >= 9 THEN '✅ PASS - ' || COUNT(*) || ' segmentation fields present'
        ELSE '❌ FAIL - Missing segmentation fields'
    END as status
FROM information_schema.columns 
WHERE table_name = 'bot_channels' 
  AND column_name IN (
    'category_filter', 'platform_filter', 'content_filter',
    'schedule_start', 'schedule_end', 'min_offer_score',
    'avoid_duplicates_hours', 'max_notifications_per_day',
    'content_filter_keywords', 'exclude_keywords', 'min_discount_percentage_filter'
  );

-- 6. VERIFICAR AUTO_PUBLISH EM SYNC_CONFIG
SELECT 
    'Sync Config Auto-Publish' as check_type,
    CASE 
        WHEN COUNT(*) >= 5 THEN '✅ PASS - ' || COUNT(*) || ' auto-publish fields present'
        ELSE '❌ FAIL - Missing auto-publish fields'
    END as status
FROM information_schema.columns 
WHERE table_name = 'sync_config' 
  AND column_name IN (
    'auto_publish', 'shopee_auto_publish', 'mercadolivre_auto_publish',
    'amazon_auto_publish', 'aliexpress_auto_publish'
  );

-- 7. VERIFICAR TEMPLATE MODES EM APP_SETTINGS
SELECT 
    'App Settings Templates' as check_type,
    CASE 
        WHEN COUNT(*) >= 4 THEN '✅ PASS - ' || COUNT(*) || ' template fields present'
        ELSE '❌ FAIL - Missing template mode fields'
    END as status
FROM information_schema.columns 
WHERE table_name = 'app_settings' 
  AND column_name IN (
    'template_mode_promotion', 'template_mode_promotion_coupon',
    'template_mode_coupon', 'template_mode_expired_coupon'
  );

-- 8. VERIFICAR VIEWS
SELECT 
    'VIEWS CHECK' as check_type,
    CASE 
        WHEN COUNT(*) >= 3 THEN '✅ PASS - ' || COUNT(*) || ' views found'
        ELSE '❌ FAIL - Missing views'
    END as status
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name IN ('active_coupons', 'product_stats', 'products_full');

-- 9. VERIFICAR FUNÇÕES
SELECT 
    'FUNCTIONS CHECK' as check_type,
    CASE 
        WHEN COUNT(*) >= 3 THEN '✅ PASS - ' || COUNT(*) || ' functions found'
        ELSE '❌ FAIL - Missing functions'
    END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'update_updated_at_column', 'cleanup_old_bot_send_logs', 'mark_expired_coupons'
  );

-- 10. VERIFICAR ÍNDICES CRÍTICOS
SELECT 
    'INDEXES CHECK' as check_type,
    CASE 
        WHEN COUNT(*) >= 40 THEN '✅ PASS - ' || COUNT(*) || ' indexes found'
        ELSE '⚠️ WARNING - Only ' || COUNT(*) || ' indexes (expected 40+)'
    END as status
FROM pg_indexes 
WHERE schemaname = 'public'
  AND tablename IN ('users', 'products', 'coupons', 'bot_channels', 'sync_logs');

-- 11. VERIFICAR RLS (Row Level Security)
SELECT 
    'RLS CHECK' as check_type,
    CASE 
        WHEN COUNT(*) >= 7 THEN '✅ PASS - RLS enabled on ' || COUNT(*) || ' tables'
        ELSE '⚠️ WARNING - RLS only on ' || COUNT(*) || ' tables'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = true
  AND tablename IN (
    'users', 'products', 'coupons', 'categories', 'app_settings',
    'bot_channels', 'telegram_channels', 'telegram_collector_config',
    'notification_preferences', 'sync_config'
  );

-- 12. VERIFICAR TRIGGERS
SELECT 
    'TRIGGERS CHECK' as check_type,
    CASE 
        WHEN COUNT(*) >= 10 THEN '✅ PASS - ' || COUNT(*) || ' triggers found'
        ELSE '⚠️ WARNING - Only ' || COUNT(*) || ' triggers'
    END as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%updated_at%';

-- =====================================================
-- RESUMO FINAL
-- =====================================================
SELECT 
    '=== VALIDATION COMPLETE ===' as message,
    CURRENT_TIMESTAMP as validated_at;

-- Se todos os checks acima mostrarem ✅ PASS, seu schema está 100% correto!
-- Se algum mostrar ❌ FAIL, você precisa executar as migrações correspondentes.
