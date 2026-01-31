-- Verificar canais WhatsApp duplicados
SELECT identifier, platform, COUNT(*) as count, array_agg(id ORDER BY created_at DESC) as ids
FROM bot_channels
WHERE platform = 'whatsapp' AND active = true
GROUP BY identifier, platform
HAVING COUNT(*) > 1;

-- Remover duplicatas (mantendo apenas o mais recente)
WITH duplicates AS (
  SELECT id, identifier,
         ROW_NUMBER() OVER (PARTITION BY identifier, platform ORDER BY created_at DESC) as rn
  FROM bot_channels
  WHERE platform = 'whatsapp' AND active = true
)
DELETE FROM bot_channels
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Verificar resultado
SELECT identifier, platform, COUNT(*) as count
FROM bot_channels
WHERE platform = 'whatsapp' AND active = true
GROUP BY identifier, platform;
