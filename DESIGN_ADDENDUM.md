# 追加仕様書：命名・表記ルール & エールポイント機能

DESIGN.md（メイン設計仕様書）への追加分。

---

## 第1部：サービス名・コイン名・表記ルール

### サービス名・コイン名

| 項目 | 名称 | 備考 |
|---|---|---|
| サービス全体の名称 | **BPエール** | 「BP」は一般的な略称表現、大会公式名称の直接使用は避ける |
| コイン名 | **エールコイン**（略称：**EC**） | 「賭ける」対象を選手・チームへの応援として表現 |

### UI文言の言い換えルール

賭け事を連想させる表現を避け、「応援」を前面に出す。実装時、画面文言・
APIレスポンスメッセージ・DB上のラベル文言（`bet_types.label`等）は
以下の対応表に統一する。

| 従来表現（設計時の呼称） | UI表示文言 |
|---|---|
| 賭ける / 賭け | エールを送る / エール |
| 賭け金 | エール枚数 |
| オッズ | 還元率 / 予想倍率 |
| 的中 | エール的中 |
| 払い戻し | エール還元 |
| ランキング（コイン所持数） | エール番付 |
| 献上（選手/チームへの直接送付） | 直エール |

※データベースのテーブル名・カラム名（`bets`, `bet_options`等）は英語のまま
変更不要。言い換えが必要なのはユーザーに見える表示文言のみ。

### 非公式であることの明記（必須）

商標（BEMANI, BEMANI PRO LEAGUE, KONAMI等）を用いず、かつ公式と誤認されない
よう、以下の対応を実装に含める。

**サイト全体の免責表記（フッター・トップページに常時表示）**

```
本サービス「BPエール」は、有志による非公式のファンコンテンツです。
BEMANI PRO LEAGUEおよびKONAMIデジタルエンタテインメント、
関連企業・団体とは一切関係ございません。
掲載情報の正確性は保証されず、実際の大会結果と異なる場合があります。
```

**新規登録画面にも同様の一文を表示**

登録前にユーザーが「お遊びの非公式サービスである」ことを認識できるよう、
登録ボタン付近にも簡潔な一文（例：「※非公式のファン企画です」）を配置する。

**メタ情報**

- ページタイトル・OGP等にも「非公式ファンサイト」の文言を含める
- ドメイン名も大会名称の直接使用を避ける（例：`bp-yell.example.com`のような
  サービス名ベースのものにする）

---

## 第2部：エールポイント機能

### 概要

選手・チームそれぞれに「エールポイント」という累積値を持たせる。2つの経路で加算される。

1. **直接献上（能動的）**：ユーザーが任意のタイミングで、任意の選手またはチームに
   手持ちのECを消費して捧げる。ECは実際にユーザーの残高から減る（コインシンク）。
   チーム単位の献上は「チーム箱推し」ユーザー向けの導線。
2. **賭け金ボーナス（受動的）**：精算時、**勝敗に関わらず**、その選手/チームが
   紐付くbet_optionに賭けられた金額の合計の一定割合（初期値10%、要調整）を
   自動でエールポイントに加算する。
   例：A選手（Aチーム）に1000EC、B選手（Bチーム）に2000ECが賭けられた場合、
   B側が勝ってもA選手/Aチームには100pt、B選手/Bチームには200ptがそれぞれ入る。
   **控除率100%（払戻率）はそのまま**とし、ベッターへの払戻額には一切影響しない。
   払戻計算とは完全に独立した、別枠の加算処理として扱う。

エールポイントはランキング・比較UIとしては表示しない。選手個人ページ・
チームページに「これだけ応援されています」という単一の数値として見せる想定。

### データベース設計（DDL）

```sql
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
  check (
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
```

**bet_optionsへの拡張（賭け金ボーナスの対象を特定するため）**

```sql
-- 個人の勝敗に対応するbet_optionにのみ設定（1vs1形式の対戦でのみ特定可能）
alter table bet_options add column player_id uuid references players(id);
-- side（'a'/'b'）が対応するチームを特定できるbet_optionに設定
-- （team_margin, match_result等、side付きのbet_optionほぼ全てに設定可能）
alter table bet_options add column team_id uuid references teams(id);
```

### 処理フロー

**直接献上（API：`POST /api/yell/donate`（選手）/ `POST /api/yell/donate-team`（チーム））**

```
1. 対象（選手ID または チームID）・献上枚数を受け取る
2. users.coins が amount 以上あるか確認（不足ならエラー）
3. トランザクション内で:
   - users.coins -= amount
   - coin_logs に type='yell_donation', amount=-amount で記録
   - yell_donations に履歴をINSERT（player_id または team_idを設定）
   - player_yell_points または team_yell_points の total_points += amount（UPSERT）
```

**賭け金ボーナス（精算バッチの追加処理）**

既存の精算ロジック（払戻計算）とは別工程として、同じ精算タイミングで実行する。

```
1. 通常通り payout_amount を計算・確定する（従来ロジックのまま、変更なし）
2. 精算対象の全bet_optionについて（勝敗は問わない）:
     stake = そのoptionに賭けられた金額の合計
     rate = system_settings.yell_point_bet_bonus_rate の値
     bonus = floor(stake * rate)
     player_id が設定されていれば player_yell_points.total_points += bonus
     team_id が設定されていれば team_yell_points.total_points += bonus
3. この加算処理は payout_amount / rate_i の計算には一切影響しない
```

同着で複数選手が「勝利扱い」になるケース（デッドヒート方式）でも、賭け金ボーナスは
勝敗に関わらず全optionに対して計算するため、判定ロジックの影響を受けない。

### UI表示について

- 選手個人ページ・チームページに「エールポイント：12,340pt」のような単一表示のみ
- 選手・チーム同士の比較・ソート・ランキング一覧は作らない方針（意図的な仕様）
- 献上導線は「◯◯選手/チームにエールを送る」ボタン＋枚数入力の簡易フォームで十分

### 未確定・要調整の項目

- 賭け金ボーナスの加算率（初期値10%、実運用しながら調整）
- 直接献上の1回あたりの上限有無（青天井にするか、多少の下限・上限を設けるか）
