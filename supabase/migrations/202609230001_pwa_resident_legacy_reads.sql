-- Allow active resident memberships to read their own gate history.
create policy pwa_package_logs_select_member
on public.package_logs for select to authenticated
using (public.pwa_is_member(conjunto_id, apartment));

create policy pwa_visitor_logs_select_member
on public.visitor_logs for select to authenticated
using (public.pwa_is_member(conjunto_id, apartment));