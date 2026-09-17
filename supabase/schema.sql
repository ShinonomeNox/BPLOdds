-- BPLOdds データベーススキーマ
-- 設計仕様書: DESIGN.md を参照

-- ==== マスターデータ ====

create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  game_title text not null,   -- 'iidx' / 'sdvx' / 'ddr'
  created_at timestamptz not null default now()
);

create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  team_id uuid not null references teams(id),
  game_title text not null,
  created_at timestamptz not null default now()
);

create table songs (
  id uuid primary key default gen_random_uuid(),
  game_title text not null,
  name text not null,
  theme text,           -- 課題曲テーマ区分
  level numeric(3,1)    -- 難易度レベル
);

-- 前シーズン以前の手動収集済み統計
create table player_legacy_stats (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id),
  season text not null,          -- 'season5' など
  category_type text not null,   -- 'theme' or 'level'
  category_value text not null,
  wins integer not null,
  plays integer not null
);

-- ==== ユーザー・コイン ====

create table users (
  id uuid primary key default gen_random_uuid(),
  login_id text unique not null,
  password_hash text not null,          -- bcrypt
  coins integer not null default 200,   -- 初期付与は少なめ
  last_login_bonus_date date,
  registered_ip text,
  created_at timestamptz not null default now()
);

create table coin_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  type text not null,      -- initial / login_bonus / bet / payout / admin_adjust
  amount integer not null, -- 増減量（マイナス可）
  related_match_id uuid,
  created_at timestamptz not null default now()
);

-- ==== 試合構造 ====

create table matches (
  id uuid primary key default gen_random_uuid(),
  game_title text not null,
  team_a_id uuid not null references teams(id),
  team_b_id uuid not null references teams(id),
  status text not null default 'scheduled', -- scheduled / live / settled
  start_time timestamptz not null,
  created_at timestamptz not null default now()
);

-- タッグバトル等、曲単位で結果が出る対戦の管理
create table tag_battle_songs (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id),
  song_id uuid references songs(id),
  song_number integer not null,
  status text not null default 'open' -- open / closed / settled（曲ごとの締切）
);

-- 出場選手（チーム・試合に対して）
create table match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id),
  player_id uuid not null references players(id),
  team_side text not null -- 'a' or 'b'
);

-- 曲ごとの個人結果（同着は同じrankをそのまま許容）
create table song_results (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references tag_battle_songs(id),
  participant_id uuid not null references match_participants(id),
  raw_score integer,
  rank integer
);

-- ==== 賭け ====

-- 賭け方の種類（機種・試合ごとに拡張可能）
create table bet_types (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id),
  song_id uuid references tag_battle_songs(id), -- 曲単位のベットの場合
  type_key text not null,   -- 'team_margin' / 'match_result_2song' / 'trifecta' 等
  label text not null,
  created_at timestamptz not null default now()
);

-- 賭け方ごとの選択肢
-- 点差系は min_diff / max_diff / side で数値レンジ管理
-- 3連単は試合ごとに動的生成（4P3など）してoption_keyに並びを保存
create table bet_options (
  id uuid primary key default gen_random_uuid(),
  bet_type_id uuid not null references bet_types(id),
  option_key text not null,   -- 'team_a' / '1-2-3'（player_idの並び）等
  label text not null,
  min_diff integer,
  max_diff integer,
  side text                   -- 'a' / 'b' / null
);

create table bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  bet_option_id uuid not null references bet_options(id),
  amount integer not null,
  payout_status text not null default 'pending', -- pending / won / lost
  payout_amount integer,
  created_at timestamptz not null default now()
);

-- ==== 集計VIEW ====

create view player_season_stats as
select
  p.id as player_id,
  p.name,
  p.team_id,
  count(sr.id) as songs_played,
  count(*) filter (where sr.rank = 1) as first_place_count,
  avg(sr.raw_score) as avg_raw_score,
  max(sr.raw_score) as best_score
from players p
left join match_participants mp on mp.player_id = p.id
left join song_results sr on sr.participant_id = mp.id
group by p.id, p.name, p.team_id;

create view player_theme_stats as
select mp.player_id, s.theme,
  count(*) as plays,
  count(*) filter (where sr.rank = 1) as wins
from song_results sr
join match_participants mp on mp.id = sr.participant_id
join tag_battle_songs tbs on tbs.id = sr.song_id
join songs s on s.id = tbs.song_id
group by mp.player_id, s.theme;
