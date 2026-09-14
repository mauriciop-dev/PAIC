-- ==============================================================================
-- Migration 010: Políticas RLS y Funciones RPC para Kiosco de Portería y Seguridad
-- ==============================================================================

-- 1. Habilitar RLS y Políticas de Acceso para Estaciones de Portería / Kiosco
-- Permite lectura de residentes para sugerencias de apartamentos en portería
DROP POLICY IF EXISTS "residents_kiosk_select" ON public.residents;
CREATE POLICY "residents_kiosk_select" ON public.residents
    FOR SELECT USING (true);

-- Permite lectura y escritura de bitácora de visitantes en portería
DROP POLICY IF EXISTS "visitor_logs_kiosk_all" ON public.visitor_logs;
CREATE POLICY "visitor_logs_kiosk_all" ON public.visitor_logs
    FOR ALL USING (true);

-- Permite lectura y escritura de paquetería en portería
DROP POLICY IF EXISTS "package_logs_kiosk_all" ON public.package_logs;
CREATE POLICY "package_logs_kiosk_all" ON public.package_logs
    FOR ALL USING (true);

-- 2. Grants de tablas para roles anon y authenticated
GRANT ALL ON TABLE public.residents TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.visitor_logs TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.package_logs TO authenticated, anon, service_role;

-- 3. RPC: get_guard_data (Carga integral de datos para el turno activo en portería)
CREATE OR REPLACE FUNCTION public.get_guard_data(p_conjunto_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'residents', COALESCE((
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT apartment, name, email, phone, conjunto_id
        FROM public.residents
        WHERE conjunto_id = p_conjunto_id
        ORDER BY apartment ASC
      ) t
    ), '[]'::json),
    'visitor_logs', COALESCE((
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT id, apartment, visitor_name, date, status, entry_time, exit_time, access_point_id, conjunto_id
        FROM public.visitor_logs
        WHERE conjunto_id = p_conjunto_id
        ORDER BY date DESC, id DESC
      ) t
    ), '[]'::json),
    'package_logs', COALESCE((
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT id, apartment, courier, tracking_number, received_date, status, conjunto_id
        FROM public.package_logs
        WHERE conjunto_id = p_conjunto_id
        ORDER BY received_date DESC, id DESC
      ) t
    ), '[]'::json)
  ) INTO result;
  RETURN result;
END;
$$;

-- 4. RPC: guard_insert_visitor_log
CREATE OR REPLACE FUNCTION public.guard_insert_visitor_log(
  p_conjunto_id text,
  p_apartment text,
  p_visitor_name text,
  p_date date,
  p_status text,
  p_entry_time text DEFAULT NULL,
  p_exit_time text DEFAULT NULL,
  p_access_point_id integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.visitor_logs (conjunto_id, apartment, visitor_name, date, status, entry_time, exit_time, access_point_id)
  VALUES (p_conjunto_id, p_apartment, p_visitor_name, p_date, p_status, p_entry_time, p_exit_time, p_access_point_id);
END;
$$;

-- 5. RPC: guard_update_visitor_log
CREATE OR REPLACE FUNCTION public.guard_update_visitor_log(
  p_id integer,
  p_status text DEFAULT NULL,
  p_entry_time text DEFAULT NULL,
  p_exit_time text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.visitor_logs
  SET status = COALESCE(p_status, status),
      entry_time = COALESCE(p_entry_time, entry_time),
      exit_time = COALESCE(p_exit_time, exit_time)
  WHERE id = p_id;
END;
$$;

-- 6. RPC: guard_insert_package_log
CREATE OR REPLACE FUNCTION public.guard_insert_package_log(
  p_conjunto_id text,
  p_apartment text,
  p_courier text,
  p_tracking_number text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.package_logs (conjunto_id, apartment, courier, tracking_number, status)
  VALUES (p_conjunto_id, p_apartment, p_courier, p_tracking_number, 'En recepción');
END;
$$;

-- 7. RPC: guard_update_package_log
CREATE OR REPLACE FUNCTION public.guard_update_package_log(
  p_id integer,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.package_logs
  SET status = p_status
  WHERE id = p_id;
END;
$$;

-- Permisos de ejecución para funciones RPC
GRANT EXECUTE ON FUNCTION public.get_guard_data(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.guard_insert_visitor_log(text, text, text, date, text, text, text, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.guard_update_visitor_log(integer, text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.guard_insert_package_log(text, text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.guard_update_package_log(integer, text) TO anon, authenticated, service_role;
