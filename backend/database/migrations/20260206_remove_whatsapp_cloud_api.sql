-- Migration to remove WhatsApp Cloud API fields/columns
-- Generated automatically during clean up

ALTER TABLE bot_config
DROP COLUMN IF EXISTS whatsapp_enabled,
DROP COLUMN IF EXISTS whatsapp_api_url,
DROP COLUMN IF EXISTS whatsapp_api_token,
DROP COLUMN IF EXISTS whatsapp_phone_number_id,
DROP COLUMN IF EXISTS whatsapp_business_account_id;
