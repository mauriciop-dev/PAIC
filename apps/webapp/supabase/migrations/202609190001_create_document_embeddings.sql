-- Habilitar extensión pgvector si está disponible
create extension if not exists vector;

-- Tabla para almacenar embeddings de documentos de Google Drive
create table if not exists public.documentos_embeddings (
    id uuid primary key default gen_random_uuid(),
    conjunto_id text not null references public.conjuntos(id) on delete cascade,
    contenido_chunk text not null,
    embedding vector(1536) not null,
    fuente_url text not null,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now()
);

-- Habilitar RLS
alter table public.documentos_embeddings enable row level security;

-- Políticas de acceso
create policy "Admins can manage documentos embeddings for their conjunto"
on public.documentos_embeddings
for all
using (
  (select role from public.user_profiles where id = auth.uid()) = 'admin'
  and conjunto_id = (select conjunto_id from public.user_profiles where id = auth.uid())
)
with check (
  (select role from public.user_profiles where id = auth.uid()) = 'admin'
  and conjunto_id = (select conjunto_id from public.user_profiles where id = auth.uid())
);

-- Índices para búsqueda por similitud coseno
create index if not exists documentos_embeddings_ivfflat_idx on public.documentos_embeddings 
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

create index if not exists idx_documentos_embeddings_conjunto_id on public.documentos_embeddings(conjunto_id);

-- Función SQL para búsqueda por similitud
create or replace function public.match_documents(
  query_embedding vector(1536),
  match_count int default 5,
  p_conjunto_id text default null
)
returns table (
  id uuid,
  contenido_chunk text,
  fuente_url text,
  metadata jsonb,
  similarity float
)
language sql
as $$
  select
    documentos_embeddings.id,
    documentos_embeddings.contenido_chunk,
    documentos_embeddings.fuente_url,
    documentos_embeddings.metadata,
    1 - (documentos_embeddings.embedding <=> query_embedding) as similarity
  from public.documentos_embeddings
  where (p_conjunto_id is null or documentos_embeddings.conjunto_id = p_conjunto_id)
  order by documentos_embeddings.embedding <=> query_embedding
  limit match_count;
$$;
