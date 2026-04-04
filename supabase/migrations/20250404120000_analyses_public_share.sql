-- Shareable analysis snapshots (public read by id for /share/:id)
--
-- If you ran an older script, `analyses` may exist WITHOUT `analyzed_doc_id`.
-- `CREATE TABLE IF NOT EXISTS` would then skip and policies fail with:
--   ERROR: column "analyzed_doc_id" does not exist
-- This file DROPS the table first so the schema is always correct.
-- (Only share-link rows are lost — usually none or test data.)
--
-- analyzed_docs.id: use the SAME type as in your DB (often bigint, not uuid).
-- Error "incompatible types: uuid and bigint" → analyzed_doc_id must be bigint below.

drop table if exists public.analyses cascade;

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  analyzed_doc_id bigint not null references public.analyzed_docs (id) on delete cascade,
  result text not null,
  created_at timestamptz not null default now(),
  constraint analyses_analyzed_doc_id_key unique (analyzed_doc_id)
);

create index analyses_analyzed_doc_id_idx on public.analyses (analyzed_doc_id);

alter table public.analyses enable row level security;

create policy "analyses_select_public_by_id"
  on public.analyses
  for select
  to anon, authenticated
  using (true);

create policy "analyses_insert_owner"
  on public.analyses
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.analyzed_docs d
      where d.id = analyzed_doc_id
        and d.user_id = auth.uid()
    )
  );

create policy "analyses_update_owner"
  on public.analyses
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.analyzed_docs d
      where d.id = analyzed_doc_id
        and d.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.analyzed_docs d
      where d.id = analyzed_doc_id
        and d.user_id = auth.uid()
    )
  );

create policy "analyses_delete_owner"
  on public.analyses
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.analyzed_docs d
      where d.id = analyzed_doc_id
        and d.user_id = auth.uid()
    )
  );
