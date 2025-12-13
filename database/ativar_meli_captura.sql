-- ============================================
-- ATIVAR CAPTURA DE CUPONS DO MERCADO LIVRE
-- ============================================

-- Verificar se já existe configuração
DO $$
DECLARE
    settings_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO settings_count FROM coupon_settings;
    
    -- Se não existe configuração, criar uma nova
    IF settings_count = 0 THEN
        INSERT INTO coupon_settings (
            id,
            auto_capture_enabled,
            capture_interval_minutes,
            shopee_enabled,
            meli_enabled,
            meli_capture_deals,
            meli_capture_campaigns,
            meli_capture_seller_promotions,
            amazon_enabled,
            aliexpress_enabled,
            notify_bots_on_new_coupon,
            notify_bots_on_expiration,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            true,                    -- auto_capture_enabled
            10,                      -- capture_interval_minutes (10 minutos)
            false,                   -- shopee_enabled (desativado por enquanto)
            true,                    -- meli_enabled (ATIVADO!)
            true,                    -- meli_capture_deals
            true,                    -- meli_capture_campaigns
            true,                    -- meli_capture_seller_promotions
            false,                   -- amazon_enabled
            false,                   -- aliexpress_enabled
            true,                    -- notify_bots_on_new_coupon
            true,                    -- notify_bots_on_expiration
            NOW(),
            NOW()
        );
        RAISE NOTICE '✅ Configuração criada com Mercado Livre ATIVADO!';
    ELSE
        -- Se já existe, apenas atualizar para ativar Mercado Livre
        UPDATE coupon_settings
        SET 
            auto_capture_enabled = true,
            meli_enabled = true,
            meli_capture_deals = true,
            meli_capture_campaigns = true,
            meli_capture_seller_promotions = true,
            capture_interval_minutes = 10,
            notify_bots_on_new_coupon = true,
            notify_bots_on_expiration = true,
            updated_at = NOW();
        
        RAISE NOTICE '✅ Configuração atualizada - Mercado Livre ATIVADO!';
    END IF;
END $$;

-- Verificar resultado
SELECT 
    'Configurações Atuais' as status,
    auto_capture_enabled as captura_ativa,
    capture_interval_minutes as intervalo_minutos,
    meli_enabled as mercado_livre_ativo,
    meli_capture_deals as captura_deals,
    meli_capture_campaigns as captura_campanhas,
    notify_bots_on_new_coupon as notificar_novos
FROM coupon_settings
LIMIT 1;

-- Listar cupons do Mercado Livre já capturados (se houver)
SELECT 
    COUNT(*) as total_cupons_meli,
    SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as ativos,
    SUM(CASE WHEN NOT is_active THEN 1 ELSE 0 END) as inativos
FROM coupons
WHERE platform = 'mercadolivre'
AND auto_captured = true;
