-- ============================================
-- PAIC Admin - Push Subscriptions Table
-- ============================================

-- 1. Crear tabla para suscripciones push
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, endpoint)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- 2. Trigger para updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER trigger_push_subscriptions_updated_at
    BEFORE UPDATE ON public.push_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. RLS - Row Level Security
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Solo el usuario dueño puede ver sus suscripciones
CREATE POLICY "Usuarios ven sus suscripciones push"
    ON public.push_subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Solo el usuario dueño puede insertar sus suscripciones
CREATE POLICY "Usuarios crean sus suscripciones push"
    ON public.push_subscriptions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Solo el usuario dueño puede eliminar sus suscripciones
CREATE POLICY "Usuarios eliminan sus suscripciones push"
    ON public.push_subscriptions
    FOR DELETE
    USING (auth.uid() = user_id);

-- 4. Función helper para superadmins: enviar push a todos los superadmins
CREATE OR REPLACE FUNCTION public.get_active_push_subscriptions()
RETURNS TABLE (
    endpoint TEXT,
    p256dh TEXT,
    auth TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT ps.endpoint, ps.p256dh, ps.auth
    FROM public.push_subscriptions ps
    JOIN public.platform_admins pa ON pa.user_id = ps.user_id
    WHERE pa.activo = true;
END;
$$;

-- 5. Comentarios
COMMENT ON TABLE public.push_subscriptions IS 'Suscripciones Web Push para notificaciones push en PAIC Admin';
COMMENT ON COLUMN public.push_subscriptions.endpoint IS 'Endpoint del servicio de push (Firebase/Chrome/Edge)';
COMMENT ON COLUMN public.push_subscriptions.p256dh IS 'Clave pública P-256 para encriptación';
COMMENT ON COLUMN public.push_subscriptions.auth IS 'Secreto de autenticación para encriptación';