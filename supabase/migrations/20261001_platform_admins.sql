-- ============================================
-- PAIC Admin - Tabla platform_admins + RLS
-- ============================================

-- 1. Crear tabla de superadministradores de plataforma
CREATE TABLE IF NOT EXISTS public.platform_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'superadmin' CHECK (rol IN ('superadmin', 'platform_operator')),
    permisos JSONB NOT NULL DEFAULT '{
        "conjuntos": true,
        "usuarios": true,
        "suscripciones": true,
        "metricas": true,
        "logs": true,
        "configuracion": true,
        "agentes": true,
        "zona_peligro": true
    }'::jsonb,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ultimo_acceso TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_platform_admins_user_id ON public.platform_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_admins_email ON public.platform_admins(email);
CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_admins_user_id ON public.platform_admins(user_id) WHERE activo;

-- 2. Trigger para updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_platform_admins_updated_at ON public.platform_admins;
CREATE TRIGGER trigger_platform_admins_updated_at
    BEFORE UPDATE ON public.platform_admins
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. RLS - Row Level Security
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Solo superadmins pueden leer la tabla (ellos mismos)
CREATE POLICY "Superadmins pueden ver admins de plataforma"
    ON public.platform_admins
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.platform_admins pa
            WHERE pa.user_id = auth.uid() AND pa.activo = true
        )
    );

-- Solo superadmins pueden insertar (crear otros superadmins)
CREATE POLICY "Superadmins pueden crear admins de plataforma"
    ON public.platform_admins
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.platform_admins pa
            WHERE pa.user_id = auth.uid() AND pa.activo = true
        )
    );

-- Solo superadmins pueden actualizar
CREATE POLICY "Superadmins pueden actualizar admins de plataforma"
    ON public.platform_admins
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.platform_admins pa
            WHERE pa.user_id = auth.uid() AND pa.activo = true
        )
    );

-- 4. Función helper para verificar si es superadmin (usada en otras políticas RLS)
CREATE OR REPLACE FUNCTION public.is_platform_superadmin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    result BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.platform_admins
        WHERE user_id = auth.uid() AND activo = true
    ) INTO result;
    RETURN result;
END;
$$;

-- 5. Insertar superadmin inicial (EJECUTAR MANUALMENTE DESPUÉS DE CREAR USUARIO EN AUTH)
-- INSERT INTO public.platform_admins (user_id, email, nombre, rol)
-- VALUES (
--     'UUID_DEL_USUARIO_EN_AUTH_USERS',
--     'admin@paicai.com.co',
--     'Super Admin PAIC',
--     'superadmin'
-- );

-- 6. Comentarios
COMMENT ON TABLE public.platform_admins IS 'Superadministradores globales de la plataforma PAIC - acceso total a admin.paicai.com.co';
COMMENT ON COLUMN public.platform_admins.permisos IS 'Permisos granulares por módulo: conjuntos, usuarios, suscripciones, metricas, logs, configuracion, agentes, zona_peligro';