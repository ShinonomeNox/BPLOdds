-- BPLOdds データベーススキーマ
-- 設計仕様書: DESIGN.md を参照

-- ==== マスターデータ ====

create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  game_title text not null,   -- 'iidx' / 'sdvx' / 'ddr'
  color text,                 -- チームカラー（HEXコード、例: '#1D4ED8'）
  created_at timestamptz not null default now()
);

create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  team_id uuid not null references teams(id),
  game_title text not null,
  display_order integer, -- チーム内での表示順（対戦カード表の掲載順を保持）
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
  coins integer not null default 1000,  -- 初期付与コイン（実際の登録処理はAPI側のINITIAL_COINSが優先）
  last_login_bonus_date date,
  last_share_bonus_date date,           -- Xシェアボーナス（1日1回）
  registered_ip text,
  is_admin boolean not null default false, -- 運営専用APIの実行権限
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
  winner_team_id uuid references teams(id), -- 試合結果登録時に設定（未設定 = 未確定）
  created_at timestamptz not null default now()
);

-- マッチ（1st/2nd/3rd/4th）：選手ペア固定で2曲対戦する単位。
-- ベットの主軸はこのラウンド単位（match_result / megamix_raw_score_diff）。
create table match_rounds (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  round_number integer not null,       -- 1,2,3,4
  round_label text not null,           -- '1st' / '2nd' / '3rd' / '4th'
  round_format text not null,          -- 'single' / 'tag' / 'megamix'
  theme text,
  level_range text,
  player_a_id uuid references players(id),
  player_b_id uuid references players(id),
  player_a2_id uuid references players(id),  -- タッグバトルのみ
  player_b2_id uuid references players(id),  -- タッグバトルのみ
  status text not null default 'scheduled',  -- scheduled / live / settled
  created_at timestamptz not null default now(),
  unique (match_id, round_number)
);

-- タッグバトル等、曲単位で結果が出る対戦の管理（match_roundsのタッグバトルのみ2曲存在）
create table tag_battle_songs (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id),
  round_id uuid references match_rounds(id) on delete cascade,
  song_id uuid references songs(id),
  song_number integer not null,
  status text not null default 'open', -- open / closed / settled（曲ごとの締切）
  theme text,       -- 選曲発表前の予告テーマ（対戦カード表に記載される情報）
  level_range text  -- 選曲発表前の予告レベル帯（例: '13-14'）
);

-- 出場選手（チーム・試合に対して）。同一選手が複数ラウンドに出ても1行のみ。
create table match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id),
  player_id uuid not null references players(id),
  team_side text not null, -- 'a' or 'b'
  unique (match_id, player_id)
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

-- 賭け方の種類（機種・試合ごとに拡張可能）。
-- match_id/round_id/song_idのいずれか1つだけが設定される
-- （match_id=試合全体の点差予想、round_id=マッチ単位の勝敗予想、song_id=曲単位の3連単）。
create table bet_types (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id),
  round_id uuid references match_rounds(id) on delete cascade,
  song_id uuid references tag_battle_songs(id), -- 曲単位のベットの場合
  type_key text not null,   -- 'team_margin' / 'match_result' / 'megamix_raw_score_diff' / 'trifecta' 等
  label text not null,
  created_at timestamptz not null default now(),
  constraint bet_types_scope_check check (
    (case when match_id is not null then 1 else 0 end)
    + (case when round_id is not null then 1 else 0 end)
    + (case when song_id is not null then 1 else 0 end) = 1
  )
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
  side text,                  -- 'a' / 'b' / null
  player_id uuid references players(id), -- 個人の勝敗に対応する場合のみ設定（エールポイント用、1vs1のみ）
  team_id uuid references teams(id)      -- sideが対応するチーム（エールポイント用）
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

-- ==== エールポイント機能（DESIGN_ADDENDUM.md参照） ====

-- 選手ごとのエールポイント累積値
create table player_yell_points (
  player_id uuid primary key references players(id),
  total_points bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- チームごとのエールポイント累積値
create table team_yell_points (
  team_id uuid primary key references teams(id),
  total_points bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- 直接献上の履歴（コインシンク、選手・チームのどちらか一方に献上する）
create table yell_donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  player_id uuid references players(id),
  team_id uuid references teams(id),
  amount integer not null check (amount > 0), -- 消費したEC枚数
  created_at timestamptz not null default now(),
  constraint yell_donations_target_check check (
    (player_id is not null and team_id is null) or
    (player_id is null and team_id is not null)
  )
);

-- 賭け金ボーナスの加算率など、コード変更なしで調整できる設定値
create table system_settings (
  key text primary key,
  value text not null
);
insert into system_settings (key, value) values
  ('yell_point_bet_bonus_rate', '0.1'); -- 10%。運営が数値だけ変更可能

-- ==== ストラテジーカード機能 ====
-- 各チームは機種ごとに2枚保有。相手の選曲を無効化し抽選で変更する効果を持つ
-- （賭けの結果・配当には影響しない）。使用可能タイミングのルールは機種ごとに
-- 異なり複雑なため（例: IIDXは4対戦中2種類まで、同ラウンドの重複は不可）、
-- システムでの自動チェックは行わず、結果登録画面からの記録・サイトでの
-- 見える化のみを行う（適合性の判断は運営の目視）。
create table strategy_card_usages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id),        -- 使用したチーム（機種込みのレコード）
  match_id uuid not null references matches(id),      -- 使用した試合
  round_label text not null,                          -- 'シングルバトル' / 'タッグバトル' / '2nd' / '3rd' / '1st' / '4th' 等
  target_song_id uuid references tag_battle_songs(id), -- 無効化した曲（分かれば任意）
  note text,
  created_at timestamptz not null default now()
);

-- ==== Realtime配信用のRLSポリシー ====
-- matches / tag_battle_songs は誰でも閲覧できる公開情報のため、
-- 読み取りのみを許可する。Supabase RealtimeはRLSで読み取りが
-- 許可されたテーブルでないとanonロールにイベントを配信しないため、
-- レプリケーション（Database > Replication）の登録に加えて必須の設定。
-- それ以外のテーブルはService Role Key経由のサーバーサイドアクセスのみのため対象外。
create policy "matches_public_read" on matches for select using (true);
create policy "tag_battle_songs_public_read" on tag_battle_songs for select using (true);
create policy "strategy_card_usages_public_read" on strategy_card_usages for select using (true);
