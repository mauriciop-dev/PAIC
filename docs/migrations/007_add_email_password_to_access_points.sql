-- Migration: Add email and password columns to access_points
-- Description: Allows storing access email string and access password for each portería/access point.

ALTER TABLE public.access_points 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS password text;

COMMENT ON COLUMN public.access_points.email IS 'Correo electrónico técnico de la portería';
COMMENT ON COLUMN public.access_points.password IS 'Contraseña técnica de la portería';
