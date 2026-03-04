-- Migration: 046_add_icon_to_app_cards
-- Adicionar coluna 'icon' à tabela app_cards

ALTER TABLE app_cards ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'gift';
