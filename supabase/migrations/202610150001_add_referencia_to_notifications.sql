-- ============================================
-- PAIC - Add referencia columns to notifications table
-- ============================================

-- 1. Agregar columnas para referencia al recurso
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS referencia_recurso UUID,
ADD COLUMN IF NOT EXISTS tipo_recurso TEXT;

-- 2. Comentarios
COMMENT ON COLUMN public.notifications.referencia_recurso IS 'ID del recurso relacionado (pqr, reserva, documento, etc.)';
COMMENT ON COLUMN public.notifications.tipo_recurso IS 'Tipo de recurso relacionado (pqr, reserva, documento, etc.)';

-- 3. Índices para búsquedas eficientes por recurso
CREATE INDEX IF NOT EXISTS idx_notifications_referencia ON public.notifications(referencia_recurso);
CREATE INDEX IF NOT EXISTS idx_notifications_tipo_recurso ON public.notifications(tipo_recurso);

-- 4. Actualizar políticas RLS si es necesario (las existentes deberían seguir funcionando)
-- Las políticas actuales se basan en conjunto_id y user_id, que no cambiamos