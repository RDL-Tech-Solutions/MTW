-- Migration to add openrouter_model_admin to app_settings
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS openrouter_model_admin TEXT DEFAULT 'mistralai/mixtral-8x7b-instruct';
