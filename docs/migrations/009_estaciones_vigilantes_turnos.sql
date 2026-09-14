-- ==============================================================================
-- Migration 009: Estaciones (Puntos de Acceso), Vigilantes y Turnos de Vigilancia
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Tabla: estaciones (Puntos de Acceso Físicos)
CREATE TABLE IF NOT EXISTS public.estaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conjunto_id TEXT NOT NULL REFERENCES public.conjuntos(id) ON DELETE CASCADE,
    codigo_estacion TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    nombre TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_estaciones_codigo UNIQUE (codigo_estacion)
);

CREATE INDEX IF NOT EXISTS idx_estaciones_conjunto ON public.estaciones(conjunto_id);
CREATE INDEX IF NOT EXISTS idx_estaciones_codigo ON public.estaciones(codigo_estacion);

-- 2. Tabla: vigilantes (Personal de Seguridad)
CREATE TABLE IF NOT EXISTS public.vigilantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conjunto_id TEXT NOT NULL REFERENCES public.conjuntos(id) ON DELETE CASCADE,
    cedula TEXT NOT NULL,
    nombre_completo TEXT NOT NULL,
    pin_hash TEXT NOT NULL, -- PIN de 6 dígitos encubierto con pgcrypto crypt()
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_vigilantes_cedula UNIQUE (cedula)
);

CREATE INDEX IF NOT EXISTS idx_vigilantes_conjunto ON public.vigilantes(conjunto_id);
CREATE INDEX IF NOT EXISTS idx_vigilantes_cedula ON public.vigilantes(cedula);

-- 3. Tabla: turnos_vigilancia (Bitácora Auditoría Legal)
CREATE TABLE IF NOT EXISTS public.turnos_vigilancia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estacion_id UUID NOT NULL REFERENCES public.estaciones(id) ON DELETE CASCADE,
    vigilante_id UUID REFERENCES public.vigilantes(id) ON DELETE SET NULL,
    vigilante_nombre_reemplazo TEXT,
    motivo_reemplazo TEXT,
    es_emergencia BOOLEAN NOT NULL DEFAULT false,
    fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    fecha_fin TIMESTAMPTZ,
    estado TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'FINALIZADO')),
    total_novedades INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_turnos_estacion ON public.turnos_vigilancia(estacion_id);
CREATE INDEX IF NOT EXISTS idx_turnos_vigilante ON public.turnos_vigilancia(vigilante_id);
CREATE INDEX IF NOT EXISTS idx_turnos_estado ON public.turnos_vigilancia(estado);

-- ==============================================================================
-- RLS (Row Level Security)
-- ==============================================================================
ALTER TABLE public.estaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vigilantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turnos_vigilancia ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura/escritura para usuarios autenticados
DROP POLICY IF EXISTS "estaciones_select_policy" ON public.estaciones;
CREATE POLICY "estaciones_select_policy" ON public.estaciones
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "estaciones_admin_policy" ON public.estaciones;
CREATE POLICY "estaciones_admin_policy" ON public.estaciones
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "vigilantes_select_policy" ON public.vigilantes;
CREATE POLICY "vigilantes_select_policy" ON public.vigilantes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "vigilantes_admin_policy" ON public.vigilantes;
CREATE POLICY "vigilantes_admin_policy" ON public.vigilantes
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "turnos_select_policy" ON public.turnos_vigilancia;
CREATE POLICY "turnos_select_policy" ON public.turnos_vigilancia
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "turnos_all_policy" ON public.turnos_vigilancia;
CREATE POLICY "turnos_all_policy" ON public.turnos_vigilancia
    FOR ALL USING (true);

-- ==============================================================================
-- RPC Functions (SECURITY DEFINER)
-- ==============================================================================

-- 1. Autenticación de Estación Física
CREATE OR REPLACE FUNCTION public.autenticar_estacion(
    p_codigo TEXT,
    p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_estacion public.estaciones%ROWTYPE;
    v_conjunto_nombre TEXT;
BEGIN
    SELECT * INTO v_estacion 
    FROM public.estaciones 
    WHERE LOWER(codigo_estacion) = LOWER(TRIM(p_codigo)) 
      AND is_active = true
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Código de estación no encontrado o inactivo.');
    END IF;

    -- Validar password_hash (soporta crypt o texto directo de transición)
    IF v_estacion.password_hash != crypt(p_password, v_estacion.password_hash) 
       AND v_estacion.password_hash != p_password THEN
        RETURN jsonb_build_object('success', false, 'error', 'Contraseña de estación incorrecta.');
    END IF;

    SELECT name INTO v_conjunto_nombre FROM public.conjuntos WHERE id = v_estacion.conjunto_id;

    RETURN jsonb_build_object(
        'success', true,
        'estacion', jsonb_build_object(
            'id', v_estacion.id,
            'conjunto_id', v_estacion.conjunto_id,
            'conjunto_nombre', COALESCE(v_conjunto_nombre, 'Conjunto'),
            'codigo_estacion', v_estacion.codigo_estacion,
            'nombre', v_estacion.nombre
        )
    );
END;
$$;

-- 2. Iniciar Turno de Vigilante
CREATE OR REPLACE FUNCTION public.iniciar_turno_vigilante(
    p_estacion_id UUID,
    p_cedula TEXT,
    p_pin TEXT,
    p_es_emergencia BOOLEAN DEFAULT false,
    p_nombre_reemplazo TEXT DEFAULT NULL,
    p_motivo_reemplazo TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_vigilante public.vigilantes%ROWTYPE;
    v_turno_id UUID;
    v_nombre_vigilante TEXT;
BEGIN
    -- Cerrar turnos previos que hayan quedado abiertos en esta estación
    UPDATE public.turnos_vigilancia
    SET estado = 'FINALIZADO', fecha_fin = timezone('utc'::text, now())
    WHERE estacion_id = p_estacion_id AND estado = 'ACTIVO';

    IF p_es_emergencia THEN
        IF TRIM(COALESCE(p_nombre_reemplazo, '')) = '' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Debe especificar el nombre del vigilante de reemplazo.');
        END IF;

        INSERT INTO public.turnos_vigilancia (
            estacion_id,
            vigilante_id,
            vigilante_nombre_reemplazo,
            motivo_reemplazo,
            es_emergencia,
            fecha_inicio,
            estado
        ) VALUES (
            p_estacion_id,
            NULL,
            TRIM(p_nombre_reemplazo),
            TRIM(p_motivo_reemplazo),
            true,
            timezone('utc'::text, now()),
            'ACTIVO'
        ) RETURNING id INTO v_turno_id;

        v_nombre_vigilante := TRIM(p_nombre_reemplazo) || ' (Reemplazo)';
    ELSE
        SELECT * INTO v_vigilante
        FROM public.vigilantes
        WHERE cedula = TRIM(p_cedula) AND is_active = true
        LIMIT 1;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Cédula no encontrada en el personal de seguridad.');
        END IF;

        -- Validar PIN de 6 dígitos
        IF v_vigilante.pin_hash != crypt(p_pin, v_vigilante.pin_hash) 
           AND v_vigilante.pin_hash != p_pin THEN
            RETURN jsonb_build_object('success', false, 'error', 'PIN de seguridad incorrecto.');
        END IF;

        INSERT INTO public.turnos_vigilancia (
            estacion_id,
            vigilante_id,
            es_emergencia,
            fecha_inicio,
            estado
        ) VALUES (
            p_estacion_id,
            v_vigilante.id,
            false,
            timezone('utc'::text, now()),
            'ACTIVO'
        ) RETURNING id INTO v_turno_id;

        v_nombre_vigilante := v_vigilante.nombre_completo;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'turno', jsonb_build_object(
            'id', v_turno_id,
            'estacion_id', p_estacion_id,
            'vigilante_id', v_vigilante.id,
            'vigilante_nombre', v_nombre_vigilante,
            'es_emergencia', p_es_emergencia,
            'fecha_inicio', timezone('utc'::text, now()),
            'estado', 'ACTIVO'
        )
    );
END;
$$;

-- 3. Cerrar Turno de Vigilante
CREATE OR REPLACE FUNCTION public.cerrar_turno_vigilante(
    p_turno_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.turnos_vigilancia
    SET estado = 'FINALIZADO',
        fecha_fin = timezone('utc'::text, now())
    WHERE id = p_turno_id;

    RETURN jsonb_build_object('success', true, 'mensaje', 'Turno finalizado exitosamente.');
END;
$$;

-- 4. Auditoría de Turnos para Administradores
CREATE OR REPLACE FUNCTION public.obtener_auditoria_turnos(
    p_conjunto_id TEXT,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_agg(row_data) INTO v_result
    FROM (
        SELECT 
            t.id,
            t.estacion_id,
            e.nombre AS estacion_nombre,
            e.codigo_estacion,
            t.vigilante_id,
            COALESCE(v.nombre_completo, t.vigilante_nombre_reemplazo, 'Desconocido') AS vigilante_nombre,
            COALESCE(v.cedula, 'N/A') AS vigilante_cedula,
            t.es_emergencia,
            t.motivo_reemplazo,
            t.fecha_inicio,
            t.fecha_fin,
            t.estado,
            t.total_novedades
        FROM public.turnos_vigilancia t
        JOIN public.estaciones e ON t.estacion_id = e.id
        LEFT JOIN public.vigilantes v ON t.vigilante_id = v.id
        WHERE e.conjunto_id = p_conjunto_id
        ORDER BY t.fecha_inicio DESC
        LIMIT p_limit OFFSET p_offset
    ) row_data;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- 5. Helper para crear/actualizar vigilante con PIN hasheado
CREATE OR REPLACE FUNCTION public.guardar_vigilante(
    p_conjunto_id TEXT,
    p_cedula TEXT,
    p_nombre_completo TEXT,
    p_pin TEXT,
    p_vigilante_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id UUID;
BEGIN
    IF p_vigilante_id IS NOT NULL THEN
        IF p_pin IS NOT NULL AND TRIM(p_pin) != '' THEN
            UPDATE public.vigilantes
            SET cedula = TRIM(p_cedula),
                nombre_completo = TRIM(p_nombre_completo),
                pin_hash = crypt(TRIM(p_pin), gen_salt('bf'))
            WHERE id = p_vigilante_id AND conjunto_id = p_conjunto_id
            RETURNING id INTO v_id;
        ELSE
            UPDATE public.vigilantes
            SET cedula = TRIM(p_cedula),
                nombre_completo = TRIM(p_nombre_completo)
            WHERE id = p_vigilante_id AND conjunto_id = p_conjunto_id
            RETURNING id INTO v_id;
        END IF;
    ELSE
        INSERT INTO public.vigilantes (
            conjunto_id,
            cedula,
            nombre_completo,
            pin_hash
        ) VALUES (
            p_conjunto_id,
            TRIM(p_cedula),
            TRIM(p_nombre_completo),
            crypt(TRIM(p_pin), gen_salt('bf'))
        ) RETURNING id INTO v_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

-- 6. Helper para crear/actualizar estación con contraseña hasheada
CREATE OR REPLACE FUNCTION public.guardar_estacion(
    p_conjunto_id TEXT,
    p_codigo_estacion TEXT,
    p_nombre TEXT,
    p_password TEXT,
    p_estacion_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id UUID;
BEGIN
    IF p_estacion_id IS NOT NULL THEN
        IF p_password IS NOT NULL AND TRIM(p_password) != '' THEN
            UPDATE public.estaciones
            SET codigo_estacion = UPPER(TRIM(p_codigo_estacion)),
                nombre = TRIM(p_nombre),
                password_hash = crypt(TRIM(p_password), gen_salt('bf'))
            WHERE id = p_estacion_id AND conjunto_id = p_conjunto_id
            RETURNING id INTO v_id;
        ELSE
            UPDATE public.estaciones
            SET codigo_estacion = UPPER(TRIM(p_codigo_estacion)),
                nombre = TRIM(p_nombre)
            WHERE id = p_estacion_id AND conjunto_id = p_conjunto_id
            RETURNING id INTO v_id;
        END IF;
    ELSE
        INSERT INTO public.estaciones (
            conjunto_id,
            codigo_estacion,
            nombre,
            password_hash
        ) VALUES (
            p_conjunto_id,
            UPPER(TRIM(p_codigo_estacion)),
            TRIM(p_nombre),
            crypt(TRIM(p_password), gen_salt('bf'))
        ) RETURNING id INTO v_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

-- ==============================================================================
-- Grants de Acceso a Roles de Supabase
-- ==============================================================================
GRANT ALL ON TABLE public.estaciones TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.vigilantes TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.turnos_vigilancia TO authenticated, anon, service_role;

GRANT EXECUTE ON FUNCTION public.autenticar_estacion(TEXT, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.iniciar_turno_vigilante(UUID, TEXT, TEXT, BOOLEAN, TEXT, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.cerrar_turno_vigilante(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.obtener_auditoria_turnos(TEXT, INT, INT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.guardar_vigilante(TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.guardar_estacion(TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated, anon, service_role;
