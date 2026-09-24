-- Residents may read attachments explicitly published for their own conjunto.
create policy pwa_storage_read_member_attachments
on storage.objects for select to authenticated
using (
  bucket_id = 'pwa-attachments'
  and (
    exists (
      select 1
      from public.pwa_documents d
      where d.file_url = name
        and public.pwa_is_member(d.conjunto_id)
    )
    or exists (
      select 1
      from public.pwa_communications c
      where c.attachment_url = name
        and c.status = 'publicado'
        and public.pwa_is_member(c.conjunto_id)
    )
  )
);