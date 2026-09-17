# BEMANI PRO LEAGUE SEASON 6 勝敗予想サイト 設計仕様書

## 概要

BEMANI PRO LEAGUE SEASON 6（IIDX / SDVX / DDR）を対象にした、コインを賭けて楽しむ
オンライン勝敗予想サイト。実質無料運用・個人情報不要を最優先とする。

## 技術スタック（すべて無料枠で運用）

| 役割 | 採用 |
|---|---|
| フロントエンド | Next.js（Vercel Hobbyプランでホスティング） |
| バックエンド | Next.js API Routes（Vercel Functions） |
| データベース | Supabase Free（PostgreSQL, 500MB） |
| リアルタイム更新 | Supabase Realtime（締切状態などをユーザー全員へ即時反映） |
| 認証 | Supabase Authは使わない。自前のID/PWテーブル（メール不要、bcryptハッシュ） |
| Bot対策 | Google reCAPTCHA v3（無料） |

必要な外部サービス登録：GitHub / Vercel / Supabase / Google（reCAPTCHA用）。
Vercel・SupabaseともGitHubアカウントでログイン可能。

## 認証・不正対策の方針

- メールアドレス不要。ユーザーが決めるログインID＋パスワードのみで登録。
- パスワード忘れ時の復旧手段は用意しない（再登録で割り切る）。
- 大量登録・オッズ操作対策：
  - 登録時のIPレート制限（Vercel Edge Middleware）
  - reCAPTCHA v3
  - 賭け金の上限は設けない（お遊びとして自由に賭けられる）
  - 初期付与コインは少なめ、ログインボーナス（1日1回、連続ログイン特典なし）で
    緩やかにコインが積み上がる設計にすることで、量産アカウントの旨味を下げる

## コインの精算方式：パリミュチュエル方式

固定オッズ（ブックメーカー方式）ではなく、賭け金をプールし締切後に按分する
パリミュチュエル方式を採用。運営がオッズを事前設定する必要がなく、管理が楽。

### 基本の精算式

```
total_pool = そのbet_typeの全賭け金合計
winning_option_ids = 正解となった bet_options.id の配列（同着なら複数）
D = total_pool - (winning_option_ids に賭けられた金額の合計)  -- 外れ分
P = 的中者がいた winning_option の数（0票の組み合わせは除外して再分配）

各 winning_option_id ごとに:
  W_i = そのoptionに賭けられた金額の合計
  payout_pool_i = W_i + (D / P)
  rate_i = payout_pool_i / W_i

各ベット（該当optionに賭けた分）に対して:
  payout = amount × rate_i
```

控除率（手数料）は運営が徴収しない前提（R=100%）。将来手数料を取る場合は
`rate_i`計算に控除率を掛けるだけで対応可能。

### 同着（dead heat）の扱い

参考：JRA（日本中央競馬会）の同着ルールをベースに設計。
「同順位グループ内はどの並びも正解とみなす」を総当たりで展開する。

```javascript
// participants: [{id, rank}] の配列。rankが同値なら同着。
function getWinningTrifectas(participants) {
  const groups = groupByRank(participants); // rank昇順でグループ化
  const fullOrderings = cartesianProductOfPermutations(groups); // 各グループ内で順列展開
  const winningTriples = new Set(
    fullOrderings.map(order => order.slice(0, 3).join(','))
  );
  return [...winningTriples];
}
```

2人同着・3人同着・4人全員同着まで、分岐なくこのロジック1つで対応できる。
4人全員同着の場合はD=0となり、自然に「掛け金そのまま返金（1倍）」に収束する。

## データベース設計（DDL）

```sql
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
```

### 集計は手動テーブルでなくVIEWで自動計算

```sql
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
```

## 各機種の点差ベット閾値（チーム間・3段階）

満点合計：IIDX=22pt（2pt×2曲＋2pt×2曲＋3pt×2曲＋4pt×2曲）、
SDVX=14pt（カウンター+1込み）、DDR=18pt（同着1位×2回で最大20ptだが目安として18）

| 段階 | IIDX (満点22) | SDVX (満点14) | DDR (満点18) |
|---|---|---|---|
| 僅差勝利 | 1〜5点差 | 1〜3点差 | 1〜4点差 |
| 勝利 | 6〜12点差 | 4〜7点差 | 5〜9点差 |
| 大差勝利 | 13点差以上 | 8点差以上 | 10点差以上 |

メガミックスバトル（SDVX 1st match）は生スコア差ベースの別枠ベット
（`type_key = 'megamix_raw_score_diff'`）。閾値は仮に僅差1〜3 / 勝利4〜7 / 大差8以上。
実運用で数試合観測してから調整すること。

## 各対戦（マッチ単位）の結果パターン

IIDX（2曲勝負・全マッチ共通）／DDRシングル／SDVXタッグに共通で使える6択：

| 結果パターン | side必要？ |
|---|---|
| 2タテ | 要（2択） |
| 1勝1分け | 要（2択） |
| 2分け | 不要（1択） |
| 1勝1敗 | 不要（1択） |

SDVXシングルバトル（3曲）は6〜10択程度（3タテ〜3分けまでの組み合わせ）。

DDRタッグバトルの順位配点（1位3pt/2位2pt/3位1pt/4位0pt）は、
{1,2}vs{3,4}=5-1、{1,3}vs{2,4}=4-2、{1,4}vs{2,3}=3-3(同点あり)
の3パターンのみなので側面付き5択で設計。

DDRタッグの3連単（曲単位）は4人から3人を選ぶ4P3=24通りを、
試合登録ではなく**曲ごとに動的生成**する。

## 締切運用（人手による判断が必須）

配信進行に選曲発表が絡むため、完全自動化は狙わない。

- 運営が「選曲発表」→「演奏開始（締切）」の2アクションを手動で実行する簡易画面を用意
- `status`遷移（open→closed→settled）は大きなボタン1つで操作
- **事故防止のため、締切判定はUI非表示だけに頼らずAPI側でも`status`を必ずチェックする**
- Supabase Realtimeで締切状態をユーザー全員の画面に即時反映し、体感のズレを減らす

## 未確定・要調整の項目

- SDVXシングルバトル（3曲）の結果パターンの正確な選択肢一覧（sideの要不要含む）
- メガミックスバトルの生スコア差の実際の閾値（試合観測後に調整）
- 前シーズンデータ（`player_legacy_stats`）の実際の収集・入力方法
- 締切ボタンを押す運営側の具体的な管理画面UI
