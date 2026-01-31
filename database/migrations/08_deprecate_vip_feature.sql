-- Migration 08: Deprecate VIP Feature
-- All users now have full access to all features

-- Add deprecation comments to VIP-related columns
COMMENT ON COLUMN users.is_vip IS 'DEPRECATED: VIP feature removed on 2026-01-31. All users have full access. Field kept for backward compatibility.';
COMMENT ON COLUMN coupons.is_vip IS 'DEPRECATED: VIP feature removed on 2026-01-31. All coupons available to everyone. Field kept for backward compatibility.';

-- Optional: Clean up existing VIP data (set all to false)
-- This is optional and can be skipped if you want to preserve historical data
UPDATE users SET is_vip = false WHERE is_vip = true;
UPDATE coupons SET is_vip = false WHERE is_vip = true;

-- Log the changes
DO $$
DECLARE
  users_updated INT;
  coupons_updated INT;
BEGIN
  GET DIAGNOSTICS users_updated = ROW_COUNT;
  
  UPDATE coupons SET is_vip = false WHERE is_vip = true;
  GET DIAGNOSTICS coupons_updated = ROW_COUNT;
  
  RAISE NOTICE 'VIP feature deprecated.';
END $$;
