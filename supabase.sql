-- =====================================================================
-- Tabel komentar publik untuk portofolio.
-- Cara pakai: Supabase Dashboard -> SQL Editor -> New query -> tempel semua isi file ini -> Run.
-- =====================================================================

create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name)    between 1 and 40),
  message     text not null check (char_length(message) between 1 and 500),
  created_at  timestamptz not null default now()
);

-- Row Level Security: pengunjung (anon) hanya boleh MEMBACA dan MENAMBAH.
-- Tidak ada policy update/delete, jadi komentar tidak bisa diubah/dihapus dari browser.
alter table public.comments enable row level security;

drop policy if exists "comments_select" on public.comments;
create policy "comments_select" on public.comments
  for select to anon using (true);

drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments
  for insert to anon
  with check (char_length(name) between 1 and 40 and char_length(message) between 1 and 500);

grant usage on schema public to anon;
grant select, insert on public.comments to anon;

-- Pengaman banjir komentar (spam): maksimal 15 komentar per menit untuk seluruh situs.
create or replace function public.comments_flood_guard() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.comments where created_at > now() - interval '1 minute') >= 15 then
    raise exception 'Terlalu banyak komentar, coba lagi sebentar';
  end if;
  return new;
end;
$$;

drop trigger if exists comments_flood on public.comments;
create trigger comments_flood before insert on public.comments
  for each row execute function public.comments_flood_guard();

-- Menghapus komentar yang tidak pantas: Dashboard -> Table Editor -> comments -> pilih baris -> Delete.
