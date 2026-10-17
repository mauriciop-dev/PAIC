-- ============================================
-- PAIC - Rellenar conjunto_id en pwa_push_subscriptions
-- ============================================
-- Asocia cada suscripción push a su conjunto usando el user_id.
-- Ejecutar en el editor SQL de Supabase (proyecto de prueba primero).

-- 1. Ver estado actual (cuántas tienen conjunto_id NULL)
SELECT
  COUNT(*) AS total,
  COUNT(conjunto_id) AS con_conjunto,
  COUNT(*) - COUNT(conjunto_id) AS sin_conjunto
FROM public.pwa_push_subscriptions;

-- 2. Actualizar conjunto_id usando pwa_memberships (prioridad: membresía activa)
UPDATE public.pwa_push_subscriptions p
SET conjunto_id = m.conjunto_id,
    updated_at = now()
FROM public.pwa_memberships m
WHERE p.user_id = m.user_id
  AND m.status = 'activo'
  AND (p.conjunto_id IS NULL OR p.conjunto_id <> m.conjunto_id);

-- 3. Para las que aún quedan NULL, intentar con user_profiles
UPDATE public.pwa_push_subscriptions p
SET conjunto_id = up.conjunto_id,
    updated_at = now()
FROM public.user_profiles up
WHERE p.user_id = up.id
  AND p.conjunto_id IS NULL
  AND up.conjunto_id IS NOT NULL;

-- 4. Reporte final: cuántas se actualizaron y cuántas siguen sin conjunto
SELECT
  COUNT(*) AS total,
  COUNT(conjunto_id) AS con_conjunto,
  COUNT(*) - COUNT(conjunto_id) AS aún_sin_conjunto
FROM public.pwa_push_subscriptions;

-- 5. Listar las que siguen sin conjunto para revisión manual
SELECT p.id, p.user_id, p.endpoint, p.created_at
FROM public.pwa_push_subscriptions p
WHERE p.conjunto_id IS NULL
ORDER BY p.created_at DESC
LIMIT 50;
