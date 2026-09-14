-- =============================================
-- Guard / Internal User Data Access RPCs
-- =============================================
-- Problem: When a Guard (internal user) logs in via the
-- authenticate_platform_user RPC, NO Supabase auth session is
-- created. The app stores the user in React state only.
-- All subsequent Supabase table queries are made as an
-- unauthenticated (anon) user, so get_my_conjunto_id()
-- returns NULL and RLS blocks every query.
--
-- Fix: SECURITY DEFINER RPCs that bypass RLS for the
-- explicit purpose of serving guard/porteria data.
-- =============================================

-- Ensure users table has pin column for guard PIN authentication
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pin text;

-- 1. READ: Get all data a guard needs in one call
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
    'users', COALESCE((
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT id, name, email, phone_number, role, password, pin, conjunto_id
        FROM public.users
        WHERE conjunto_id = p_conjunto_id
      ) t
    ), '[]'::json),
    'access_points', COALESCE((
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT id, name, email, password, usuario_id, conjunto_id
        FROM public.access_points
        WHERE conjunto_id = p_conjunto_id
      ) t
    ), '[]'::json),
    'visitor_logs', COALESCE((
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT id, apartment, visitor_name, date, status, entry_time, exit_time, access_point_id, conjunto_id
        FROM public.visitor_logs
        WHERE conjunto_id = p_conjunto_id
        ORDER BY date DESC
      ) t
    ), '[]'::json),
    'package_logs', COALESCE((
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT id, apartment, courier, tracking_number, received_date, status, conjunto_id
        FROM public.package_logs
        WHERE conjunto_id = p_conjunto_id
        ORDER BY received_date DESC
      ) t
    ), '[]'::json),
    'residents', COALESCE((
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT apartment, name, email, phone, conjunto_id
        FROM public.residents
        WHERE conjunto_id = p_conjunto_id
      ) t
    ), '[]'::json)
  ) INTO result;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_guard_data(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_guard_data(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_guard_data(text) TO authenticated;

-- 2. WRITE: Insert visitor log
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

REVOKE ALL ON FUNCTION public.guard_insert_visitor_log(text, text, text, date, text, text, text, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.guard_insert_visitor_log(text, text, text, date, text, text, text, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.guard_insert_visitor_log(text, text, text, date, text, text, text, integer) TO authenticated;

-- 3. WRITE: Update visitor log status
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

REVOKE ALL ON FUNCTION public.guard_update_visitor_log(integer, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.guard_update_visitor_log(integer, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.guard_update_visitor_log(integer, text, text, text) TO authenticated;

-- 4. WRITE: Insert package log
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

REVOKE ALL ON FUNCTION public.guard_insert_package_log(text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.guard_insert_package_log(text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.guard_insert_package_log(text, text, text, text) TO authenticated;

-- 5. WRITE: Update package log status
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

REVOKE ALL ON FUNCTION public.guard_update_package_log(integer, text) FROM public;
GRANT EXECUTE ON FUNCTION public.guard_update_package_log(integer, text) TO anon;
GRANT EXECUTE ON FUNCTION public.guard_update_package_log(integer, text) TO authenticated;
