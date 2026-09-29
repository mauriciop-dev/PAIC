alter table public.conjuntos
  add column if not exists plan_name text,
  add column if not exists plan_expires_at timestamptz,
  add column if not exists preapproval_id text,
  add column if not exists last_payment_id text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, full_name, avatar_url, email, role, trial_expires_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', new.email),
    new.raw_user_meta_data ->> 'avatar_url',
    new.email,
    'trial',
    now() + interval '14 days'
  );
  return new;
end;
$$;

create or replace function public.paic_can_write_conjunto(target_conjunto_id text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_role public.user_role;
  profile_conjunto_id text;
  trial_expiration timestamptz;
  profile_email text;
  current_subscription text;
  paid_expiration timestamptz;
begin
  if target_conjunto_id is null then
    return false;
  end if;

  if auth.uid() is null then
    return false;
  end if;

  select role, conjunto_id, trial_expires_at, email
    into current_role, profile_conjunto_id, trial_expiration, profile_email
    from public.user_profiles
    where id = auth.uid();

  if not found then
    return false;
  end if;
  if lower(coalesce(profile_email, '')) = 'shadowalkalone@gmail.com' then
    return profile_conjunto_id = target_conjunto_id;
  end if;

  if current_role not in ('trial', 'subscriber') then
    return true;
  end if;

  if profile_conjunto_id is distinct from target_conjunto_id then
    return false;
  end if;

  select subscription_plan, plan_expires_at
    into current_subscription, paid_expiration
    from public.conjuntos
    where id = target_conjunto_id;

  if current_subscription = 'Paid'
    and (paid_expiration is null or paid_expiration > now()) then
    return true;
  end if;

  return current_role = 'trial'
    and trial_expiration is not null
    and trial_expiration > now();
end;
$$;

revoke all on function public.paic_can_write_conjunto(text) from public;
grant execute on function public.paic_can_write_conjunto(text) to authenticated;

create or replace function public.paic_enforce_trial_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_conjunto_id text;
begin
  if coalesce(auth.role(), '') not in ('anon', 'authenticated') then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_table_name = 'pwa_memberships'
    and tg_op in ('INSERT', 'UPDATE')
    and new.user_id = auth.uid()
    and new.status in ('pendiente', 'activo') then
    return new;
  end if;

  if tg_table_name in ('pwa_reservations', 'pwa_pqrs', 'pwa_visit_authorizations')
    and tg_op = 'INSERT'
    and new.user_id = auth.uid() then
    return new;
  end if;

  if tg_table_name = 'pwa_resident_invitations'
    and tg_op = 'UPDATE'
    and old.used_at is null
    and new.used_at is not null
    and exists (
      select 1
      from public.pwa_memberships membership
      where membership.user_id = auth.uid()
        and membership.conjunto_id = new.conjunto_id
        and membership.apartment = new.apartment
        and membership.status = 'activo'
    ) then
    return new;
  end if;

  if tg_table_name = 'residents'
    and tg_op = 'UPDATE'
    and old.user_id is null
    and new.user_id = auth.uid()
    and new.pwa_status = 'active'
    and exists (
      select 1
      from public.pwa_memberships membership
      where membership.user_id = auth.uid()
        and membership.conjunto_id = new.conjunto_id
        and membership.apartment = new.apartment
        and membership.status = 'activo'
    ) then
    return new;
  end if;

  if tg_table_name = 'conjuntos' then
    if tg_op = 'INSERT' then
      if auth.uid() is not null
        and lower(coalesce(auth.jwt() ->> 'email', '')) <> 'shadowalkalone@gmail.com'
        and not exists (
          select 1 from public.user_profiles profile
          where profile.id = auth.uid()
            and profile.role = 'trial'
            and profile.conjunto_id is null
            and profile.trial_expires_at > now()
        ) then
        raise exception 'La prueba venció. Selecciona un plan activo para crear una copropiedad.'
          using errcode = '42501';
      end if;
      return new;
    end if;
    if tg_op = 'DELETE' then
      target_conjunto_id := old.id;
    else
      target_conjunto_id := new.id;
    end if;
  else
    if tg_op = 'DELETE' then
      target_conjunto_id := old.conjunto_id;
    else
      target_conjunto_id := new.conjunto_id;
    end if;
  end if;

  if not public.paic_can_write_conjunto(target_conjunto_id) then
    raise exception 'La prueba venció. Selecciona un plan activo para modificar esta copropiedad.'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' then
    if tg_table_name = 'conjuntos' then
      target_conjunto_id := old.id;
    else
      target_conjunto_id := old.conjunto_id;
    end if;
    if not public.paic_can_write_conjunto(target_conjunto_id) then
      raise exception 'La prueba venció. Selecciona un plan activo para modificar esta copropiedad.'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;


do $$
declare
  target_table_name text;
  write_tables text[] := array[
    'access_points',
    'account_status',
    'bookings',
    'chat_messages',
    'chatbot_interactions',
    'common_areas',
    'communication_campaigns',
    'communication_campaign_recipients',
    'conjuntos',
    'documentos_embeddings',
    'due_dates',
    'expenses',
    'incomes',
    'internal_staff',
    'package_logs',
    'pwa_account_status',
    'pwa_communications',
    'pwa_documents',
    'pwa_directories',
    'pwa_memberships',
    'pwa_pqrs',
    'pwa_reservations',
    'pwa_resident_invitations',
    'pwa_visit_authorizations',
    'providers',
    'reservations',
    'residents',
    'estaciones',
    'tasks',
    'turnos_vigilancia',
    'user_roles',
    'users',
    'vigilantes',
    'visitor_logs'
  ];
begin
  foreach target_table_name in array write_tables loop
    if to_regclass(format('public.%I', target_table_name)) is not null
      and exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and information_schema.columns.table_name = target_table_name
          and column_name = case when target_table_name = 'conjuntos' then 'id' else 'conjunto_id' end
      ) then
      execute format('drop trigger if exists paic_trial_write_guard on public.%I', target_table_name);
      execute format(
        'create trigger paic_trial_write_guard before insert or update or delete on public.%I for each row execute function public.paic_enforce_trial_write()',
        target_table_name
      );
    end if;
  end loop;
end;
$$;

create or replace function public.paic_protect_billing_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if tg_table_name = 'user_profiles' then
      if new.role is distinct from old.role
        or new.email is distinct from old.email
        or new.trial_expires_at is distinct from old.trial_expires_at
        or (
          new.conjunto_id is distinct from old.conjunto_id
          and (
            old.conjunto_id is not null
            or (
              lower(coalesce(auth.jwt() ->> 'email', '')) <> 'shadowalkalone@gmail.com'
              and (
                old.role <> 'trial'
                or old.trial_expires_at is null
                or old.trial_expires_at <= now()
              )
            )
          )
        ) then
        raise exception 'Los permisos y la información de acceso solo pueden cambiarse desde el servidor.'
          using errcode = '42501';
      end if;
    elsif tg_table_name = 'conjuntos' then
      if new.subscription_plan is distinct from old.subscription_plan
        or new.plan_name is distinct from old.plan_name
        or new.plan_price is distinct from old.plan_price
        or new.plan_expires_at is distinct from old.plan_expires_at
        or new.preapproval_id is distinct from old.preapproval_id
        or new.last_payment_id is distinct from old.last_payment_id then
        raise exception 'Los datos de suscripción solo pueden cambiarse desde el servidor.'
          using errcode = '42501';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists paic_protect_profile_billing_fields on public.user_profiles;
create trigger paic_protect_profile_billing_fields
before update on public.user_profiles
for each row execute function public.paic_protect_billing_fields();

drop trigger if exists paic_protect_conjunto_billing_fields on public.conjuntos;
create trigger paic_protect_conjunto_billing_fields
before update on public.conjuntos
for each row execute function public.paic_protect_billing_fields();

create table if not exists public.paic_billing_events (
  provider_event_id text primary key,
  conjunto_id text not null references public.conjuntos(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.paic_billing_events enable row level security;
revoke all on public.paic_billing_events from public, anon, authenticated;

create or replace function public.paic_activate_subscription(
  target_conjunto_id text,
  target_event_id text,
  target_plan_name text,
  target_plan_price numeric,
  target_plan_expires_at timestamptz,
  target_preapproval_id text,
  target_payment_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.conjuntos where id = target_conjunto_id) then
    raise exception 'La copropiedad no existe.';
  end if;

  insert into public.paic_billing_events (provider_event_id, conjunto_id)
    values (target_event_id, target_conjunto_id);

  update public.conjuntos
    set subscription_plan = 'Paid',
        plan_name = target_plan_name,
        plan_price = target_plan_price,
        plan_expires_at = target_plan_expires_at,
        preapproval_id = target_preapproval_id,
        last_payment_id = target_payment_id
    where id = target_conjunto_id;
end;
$$;

revoke all on function public.paic_activate_subscription(text,text,text,numeric,timestamptz,text,text)
  from public, anon, authenticated;
grant execute on function public.paic_activate_subscription(text,text,text,numeric,timestamptz,text,text)
  to service_role;

drop policy if exists "Allow individual read access" on public.user_profiles;
drop policy if exists "Allow individual update access" on public.user_profiles;
drop policy if exists "Los usuarios pueden ver y editar su propio perfil." on public.user_profiles;
create policy paic_profile_select_own on public.user_profiles
  for select to authenticated using (auth.uid() = id);
create policy paic_profile_update_own on public.user_profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

do $$
begin
  if to_regclass('public.chat_messages') is not null then
    execute 'drop policy if exists "Users own their chat messages" on public.chat_messages';
    execute 'drop policy if exists paic_chat_messages_select_own on public.chat_messages';
    execute 'drop policy if exists paic_chat_messages_insert_own on public.chat_messages';
    execute 'drop policy if exists paic_chat_messages_update_own on public.chat_messages';
    execute 'drop policy if exists paic_chat_messages_delete_own on public.chat_messages';
    execute 'create policy paic_chat_messages_select_own on public.chat_messages for select to authenticated using (auth.uid() = user_id)';
    execute 'create policy paic_chat_messages_insert_own on public.chat_messages for insert to authenticated with check (auth.uid() = user_id and public.paic_can_write_conjunto(conjunto_id))';
    execute 'create policy paic_chat_messages_update_own on public.chat_messages for update to authenticated using (auth.uid() = user_id and public.paic_can_write_conjunto(conjunto_id)) with check (auth.uid() = user_id and public.paic_can_write_conjunto(conjunto_id))';
    execute 'create policy paic_chat_messages_delete_own on public.chat_messages for delete to authenticated using (auth.uid() = user_id and public.paic_can_write_conjunto(conjunto_id))';
  end if;
end;
$$;

do $$
declare
  table_name text;
  tenant_tables text[] := array[
    'access_points',
    'account_status',
    'bookings',
    'chatbot_interactions',
    'common_areas',
    'due_dates',
    'expenses',
    'incomes',
    'internal_staff',
    'package_logs',
    'providers',
    'residents',
    'tasks',
    'user_roles',
    'users',
    'visitor_logs'
  ];
begin
  foreach table_name in array tenant_tables loop
    execute format('drop policy if exists %I on public.%I', 'Enable access for own conjunto', table_name);
    execute format('drop policy if exists %I on public.%I', 'paic_read_own_conjunto', table_name);
    execute format('drop policy if exists %I on public.%I', 'paic_insert_own_conjunto', table_name);
    execute format('drop policy if exists %I on public.%I', 'paic_update_own_conjunto', table_name);
    execute format('drop policy if exists %I on public.%I', 'paic_delete_own_conjunto', table_name);

    execute format(
      'create policy paic_read_own_conjunto on public.%I for select to authenticated using (conjunto_id::text = public.get_my_conjunto_id())',
      table_name
    );
    execute format(
      'create policy paic_insert_own_conjunto on public.%I for insert to authenticated with check (conjunto_id::text = public.get_my_conjunto_id() and public.paic_can_write_conjunto(conjunto_id::text))',
      table_name
    );
    execute format(
      'create policy paic_update_own_conjunto on public.%I for update to authenticated using (conjunto_id::text = public.get_my_conjunto_id() and public.paic_can_write_conjunto(conjunto_id::text)) with check (conjunto_id::text = public.get_my_conjunto_id() and public.paic_can_write_conjunto(conjunto_id::text))',
      table_name
    );
    execute format(
      'create policy paic_delete_own_conjunto on public.%I for delete to authenticated using (conjunto_id::text = public.get_my_conjunto_id() and public.paic_can_write_conjunto(conjunto_id::text))',
      table_name
    );
  end loop;
end;
$$;

drop policy if exists "Enable SELECT for own conjunto" on public.conjuntos;
drop policy if exists "Allow authenticated users to insert conjuntos" on public.conjuntos;
drop policy if exists "Enable UPDATE for own conjunto" on public.conjuntos;
drop policy if exists "Enable DELETE for own conjunto" on public.conjuntos;
create policy paic_read_own_conjunto on public.conjuntos
  for select to authenticated using (id = public.get_my_conjunto_id());
create policy paic_insert_own_conjunto on public.conjuntos
  for insert to authenticated with check (
    auth.role() = 'authenticated'
    and (
      lower(coalesce(auth.jwt() ->> 'email', '')) = 'shadowalkalone@gmail.com'
      or exists (
        select 1 from public.user_profiles profile
        where profile.id = auth.uid()
          and profile.role = 'trial'
          and profile.conjunto_id is null
          and profile.trial_expires_at > now()
      )
    )
  );
create policy paic_update_own_conjunto on public.conjuntos
  for update to authenticated using (
    id = public.get_my_conjunto_id()
    and public.paic_can_write_conjunto(id)
  ) with check (
    id = public.get_my_conjunto_id()
    and public.paic_can_write_conjunto(id)
  );
create policy paic_delete_own_conjunto on public.conjuntos
  for delete to authenticated using (
    id = public.get_my_conjunto_id()
    and public.paic_can_write_conjunto(id)
  );

drop policy if exists "Allow admin to manage their own reservations" on public.reservations;
create policy paic_reservations_select_own on public.reservations
  for select to authenticated using (conjunto_id::text = public.get_my_conjunto_id());
create policy paic_reservations_insert_own on public.reservations
  for insert to authenticated with check (
    conjunto_id::text = public.get_my_conjunto_id()
    and public.paic_can_write_conjunto(conjunto_id::text)
  );
create policy paic_reservations_update_own on public.reservations
  for update to authenticated using (
    conjunto_id::text = public.get_my_conjunto_id()
    and public.paic_can_write_conjunto(conjunto_id::text)
  ) with check (
    conjunto_id::text = public.get_my_conjunto_id()
    and public.paic_can_write_conjunto(conjunto_id::text)
  );
create policy paic_reservations_delete_own on public.reservations
  for delete to authenticated using (
    conjunto_id::text = public.get_my_conjunto_id()
    and public.paic_can_write_conjunto(conjunto_id::text)
  );

drop policy if exists communication_campaigns_admin_access on public.communication_campaigns;
create policy communication_campaigns_read_own on public.communication_campaigns
  for select to authenticated using (conjunto_id = public.get_my_conjunto_id());
create policy communication_campaigns_insert_own on public.communication_campaigns
  for insert to authenticated with check (
    conjunto_id = public.get_my_conjunto_id()
    and public.paic_can_write_conjunto(conjunto_id)
  );
create policy communication_campaigns_update_own on public.communication_campaigns
  for update to authenticated using (
    conjunto_id = public.get_my_conjunto_id()
    and public.paic_can_write_conjunto(conjunto_id)
  ) with check (
    conjunto_id = public.get_my_conjunto_id()
    and public.paic_can_write_conjunto(conjunto_id)
  );
create policy communication_campaigns_delete_own on public.communication_campaigns
  for delete to authenticated using (
    conjunto_id = public.get_my_conjunto_id()
    and public.paic_can_write_conjunto(conjunto_id)
  );

drop policy if exists communication_campaign_recipients_admin_access on public.communication_campaign_recipients;
create policy communication_campaign_recipients_read_own on public.communication_campaign_recipients
  for select to authenticated using (conjunto_id = public.get_my_conjunto_id());
create policy communication_campaign_recipients_insert_own on public.communication_campaign_recipients
  for insert to authenticated with check (
    conjunto_id = public.get_my_conjunto_id()
    and public.paic_can_write_conjunto(conjunto_id)
  );
create policy communication_campaign_recipients_update_own on public.communication_campaign_recipients
  for update to authenticated using (
    conjunto_id = public.get_my_conjunto_id()
    and public.paic_can_write_conjunto(conjunto_id)
  ) with check (
    conjunto_id = public.get_my_conjunto_id()
    and public.paic_can_write_conjunto(conjunto_id)
  );
create policy communication_campaign_recipients_delete_own on public.communication_campaign_recipients
  for delete to authenticated using (
    conjunto_id = public.get_my_conjunto_id()
    and public.paic_can_write_conjunto(conjunto_id)
  );

drop policy if exists pwa_visit_auth_admin_update on public.pwa_visit_authorizations;
create policy pwa_visit_auth_admin_update on public.pwa_visit_authorizations
  for update to authenticated
  using (public.pwa_is_admin(conjunto_id) and public.paic_can_write_conjunto(conjunto_id))
  with check (public.pwa_is_admin(conjunto_id) and public.paic_can_write_conjunto(conjunto_id));
drop policy if exists pwa_visit_auth_insert_member on public.pwa_visit_authorizations;
create policy pwa_visit_auth_insert_member on public.pwa_visit_authorizations
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.pwa_is_member(conjunto_id, apartment)
  );

drop policy if exists pwa_memberships_insert_self on public.pwa_memberships;
create policy pwa_memberships_insert_self on public.pwa_memberships
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pendiente'
  );

drop policy if exists pwa_reservations_insert_member on public.pwa_reservations;
create policy pwa_reservations_insert_member on public.pwa_reservations
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.pwa_is_member(conjunto_id, apartment)
  );
drop policy if exists pwa_pqrs_insert_member on public.pwa_pqrs;
create policy pwa_pqrs_insert_member on public.pwa_pqrs
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.pwa_is_member(conjunto_id, apartment)
  );

create policy paic_storage_write_guard on storage.objects
  as restrictive for insert to authenticated
  with check (
    bucket_id not in ('conjunto-files', 'pwa-attachments')
    or (
      bucket_id = 'conjunto-files'
      and (
      (storage.foldername(name))[1] = public.get_my_conjunto_id()
      and public.paic_can_write_conjunto((storage.foldername(name))[1])
      )
    )
    or (
      bucket_id = 'pwa-attachments'
      and (
        (storage.foldername(name))[1] <> 'admin'
        or public.paic_can_write_conjunto(public.get_my_conjunto_id())
      )
    )
  );
create policy paic_storage_update_guard on storage.objects
  as restrictive for update to authenticated
  using (
    bucket_id not in ('conjunto-files', 'pwa-attachments')
    or (
      bucket_id = 'conjunto-files'
      and
      (
      (storage.foldername(name))[1] = public.get_my_conjunto_id()
      and public.paic_can_write_conjunto((storage.foldername(name))[1])
      )
    )
    or (
      bucket_id = 'pwa-attachments'
      and (
        (storage.foldername(name))[1] <> 'admin'
        or public.paic_can_write_conjunto(public.get_my_conjunto_id())
      )
    )
  )
  with check (
    bucket_id not in ('conjunto-files', 'pwa-attachments')
    or (
      bucket_id = 'conjunto-files'
      and
      (
      (storage.foldername(name))[1] = public.get_my_conjunto_id()
      and public.paic_can_write_conjunto((storage.foldername(name))[1])
      )
    )
    or (
      bucket_id = 'pwa-attachments'
      and (
        (storage.foldername(name))[1] <> 'admin'
        or public.paic_can_write_conjunto(public.get_my_conjunto_id())
      )
    )
  );
create policy paic_storage_delete_guard on storage.objects
  as restrictive for delete to authenticated
  using (
    bucket_id not in ('conjunto-files', 'pwa-attachments')
    or (
      bucket_id = 'conjunto-files'
      and
      (
      (storage.foldername(name))[1] = public.get_my_conjunto_id()
      and public.paic_can_write_conjunto((storage.foldername(name))[1])
      )
    )
    or (
      bucket_id = 'pwa-attachments'
      and (
        (storage.foldername(name))[1] <> 'admin'
        or public.paic_can_write_conjunto(public.get_my_conjunto_id())
      )
    )
  );
