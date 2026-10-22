-- カヤジュッドサイト: 初期スキーマ（SupabaseのSQL Editorに貼って実行）

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null check (handle ~ '^[a-zA-Z0-9_]{3,20}$'),
  display_name text not null default '',
  bio text not null default '',
  avatar_url text,
  header_url text,
  created_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null default '' check (char_length(text) <= 3000),
  file_urls text[] not null default '{}',
  reply_to uuid references public.notes(id) on delete set null,
  renote_of uuid references public.notes(id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    char_length(text) > 0
    or renote_of is not null
    or coalesce(array_length(file_urls, 1), 0) > 0
  )
);
create index notes_created_at_idx on public.notes (created_at desc);

create table public.reactions (
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) <= 16),
  created_at timestamptz not null default now(),
  primary key (note_id, user_id, emoji)
);

-- 新規登録時にプロフィールを自動作成（IDは仮の値。あとでプロフィール編集で変更）
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, handle, display_name)
  values (
    new.id,
    'user_' || substr(replace(new.id::text, '-', ''), 1, 10),
    split_part(coalesce(new.email, ''), '@', 1)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 行レベルセキュリティ
alter table public.profiles  enable row level security;
alter table public.notes     enable row level security;
alter table public.reactions enable row level security;

create policy "profiles: 誰でも閲覧" on public.profiles for select using (true);
create policy "profiles: 自分のみ更新" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "notes: 誰でも閲覧" on public.notes for select using (true);
create policy "notes: 自分として投稿" on public.notes for insert with check (auth.uid() = user_id);
create policy "notes: 自分の投稿のみ削除" on public.notes for delete using (auth.uid() = user_id);

create policy "reactions: 誰でも閲覧" on public.reactions for select using (true);
create policy "reactions: 自分として追加" on public.reactions for insert with check (auth.uid() = user_id);
create policy "reactions: 自分のみ削除" on public.reactions for delete using (auth.uid() = user_id);

-- リアルタイム配信を有効化
alter publication supabase_realtime add table public.notes;
alter publication supabase_realtime add table public.reactions;
