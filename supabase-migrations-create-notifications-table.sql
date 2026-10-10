// PAIC — Tabla de notificaciones para Supabase
// Ejecutar como SQL en tu proyecto Supabase: https://supabase.com/dashboard/project/vgmwlzhlpehuvfkgqzja/sql/new

-- Crear tabla notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid references conjuntos(id) not null,
  user_id uuid references users(id),           -- null = envía a todos los residentes del conjunto
  tipo text not null,                          -- comunicado | reserva | pqr | documento | votacion | directorio | porteria | visitante
  titulo text not null,
  cuerpo text,
  leido boolean default false,
  creado_at timestamp with time zone default now()
);

-- Índices para búsqueda rápida
create index idx_notifications_conjunto on notifications(conjunto_id);
create index idx_notifications_user on notifications(user_id);
create index idx_notifications_conjunto_leido on notifications(conjunto_id, leido) where leido = false;
create index idx_notifications_tipo on notifications(tipo);

-- Permisos para que la app pueda leer/escribir (ajustar según tu configuración de RLS)
alter table notifications enable row level security;

create policy "Permitir lectura para residentes y admin" on notifications
  for select using (
    auth.role() in ('authenticated', 'admin', 'resident') and
    conjunto_id in (select conjunto_id from users where id = auth.uid())
  );

create policy "Permitir escritura para admin" on notifications
  for insert with check (
    auth.role() = 'admin' or
    (auth.role() = 'resident' and conjunto_id in (select conjunto_id from users where id = auth.uid()))
  );

create policy "Permitir actualización" on notifications
  for update using (
    auth.role() = 'admin' or
    (auth.role() = 'resident' and user_id = auth.uid())
  );