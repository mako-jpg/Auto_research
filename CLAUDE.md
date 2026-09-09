# Auto_research

個人のリサーチ → Note記事下書き → ショート動画構成、を自動化するプロジェクト。

## 全体像

1. **`memo-app/`** — Vercelにデプロイして使う自作Webメモアプリ（Vercel Serverless Functions + Vercel Blob）。「リサーチしてほしいトピック」を記録する。メモ本体はVercel Blob上のJSON（`memos.json`）に保存される（このリポジトリのgit管理下ではない）。デプロイ先URLは `docs/deployment.md` を参照。
2. **`.claude/agents/`** — パイプラインで使うサブエージェント定義。
   - `researcher` — Web検索でトピックを調査し、出典付きのリサーチブリーフを作る
   - `article-writer` — リサーチブリーフからNote記事の下書きを書く
   - `video-composer` — 記事からショート動画（Shorts/TikTok/Reels想定）の構成・台本を作る
3. **`.claude/skills/research-pipeline/SKILL.md`** — デプロイ済みメモアプリのAPIからメモを取得し、3つのサブエージェントを順番に呼び出して `output/` 配下に成果物を作るオーケストレーションスキル。手動なら `/research-pipeline` として呼び出せる。
4. **`output/<slug>/`** — 生成された `research.md` / `article.md` / `video-structure.md`。すべて **下書き**。このリポジトリにコミットされる。自動公開はしない。単発メモは `output/<slug>/*.md` 直下、定期メモは `output/<slug>/<date>/*.md`（実行日ごとのサブフォルダ）に積み重なっていく。

## メモアプリのアーキテクチャ（`memo-app/`）

- `api/` — Vercel Serverless Functions（Node.js）。`login.js`（人間のログイン）/ `logout.js` / `memos.js`（一覧取得・作成）/ `memos/[id].js`（更新・削除）/ `memos/[id]/outputs/[type].js`（生成物本文のアップロード・取得。`type` は `article`/`video`。リサーチ内容はWeb UI上のアップロード対象ではない。クエリパラメータ `?date=YYYY-MM-DD` を付けると、定期メモのその日付時点の生成物を個別に読み書きできる。省略時は常に「最新」を読み書きする）/ `memos/[id]/screenshot.js`（メモに添付したスクリーンショット画像のアップロード（PUT、body は生の画像バイナリ、`Content-Type: image/*`）・取得（GET）・削除（DELETE））/ `categories.js`（カテゴリ一覧取得・追加）。
- `lib/store.js` — Vercel Blob（`memos.json`、`categories.json`、`outputs/<id>/<type>.md` の「最新」生成物本文、定期メモの過去分は `outputs/<id>/<type>/<date>.md`、スクリーンショット画像は `screenshots/<id>`）への読み書き。
- `lib/schema.js` — 優先度（1〜5の整数）・カテゴリ配列・生成する項目（`outputTypes`）・リサーチ方法（`researchMode`/`recurringFrequency`/`recurringDayOfWeek`/`recurringDayOfMonth`/`recurringCustomDates`/`recurringTime`）・参照URL（`sourceUrl`）のバリデーション共通処理。
- `lib/auth.js` — 認証。**2種類の独立した資格情報**を使う:
  - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — 人間がブラウザからログインするための資格情報。ログインするとセッションCookieが発行される。
  - `PIPELINE_TOKEN` — Claude CodeのRoutine（後述）がAPIを叩くための専用トークン。`Authorization: Bearer <PIPELINE_TOKEN>` ヘッダで認証する。人間用パスワードとは別物なので、片方が漏れてももう片方には影響しない。
- `public/` — 静的UI（`index.html` / `login.html` / `app.js` / `style.css`）。

必要な環境変数（Vercelプロジェクトに設定）: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `PIPELINE_TOKEN`, `BLOB_READ_WRITE_TOKEN`（Blobストアをプロジェクトにアタッチすると自動設定される）。値は `docs/deployment.md` を参照（このファイル自体はgit管理・値は書かない）。

## メモのスキーマ（`memos.json`、Vercel Blob上）

```json
{
  "memos": [
    {
      "id": "abc123",
      "title": "string",
      "brief": "何を・どんな角度でリサーチしてほしいか",
      "categories": ["AI", "マーケティング"],
      "priority": 3,
      "outputTypes": ["article", "video"],
      "researchMode": "once",
      "recurringFrequency": "weekly",
      "recurringDayOfWeek": null,
      "recurringDayOfMonth": null,
      "recurringCustomDates": [],
      "recurringTime": null,
      "status": "pending",
      "created_at": "ISO8601",
      "updated_at": "ISO8601",
      "sourceUrl": null,
      "screenshot": false,
      "outputs": {},
      "history": [],
      "last_processed_at": null,
      "slug": null
    }
  ]
}
```

`priority` は1〜5の整数（デフォルト3、大きいほど優先度が高い）。`categories` はユーザーが `categories.json`（同じくVercel Blob上、`GET/POST /api/categories` で管理）に登録した名前の中から選んだもの。

`outputTypes` はそのメモについてAIに生成させる項目（`"article"`＝記事下書き / `"video"`＝動画構成、いずれか1つ以上。デフォルトは両方）。ユーザーがメモ作成・編集フォームのボタンで選ぶ。**`"research"`（リサーチ）は選択肢ではない** — リサーチはパイプラインが常に内部的に行う下調べのステップであり、`output/<slug>/research.md` としてリポジトリには残すが、Web UI上の生成物（`outputs`）としては扱わない・アップロードしない。

`sourceUrl` はユーザーが貼り付けた参照URL（InstagramやX、YouTubeの投稿URLなど、任意）。`screenshot` はユーザーが添付したスクリーンショット画像が存在するかを表す真偽値で、実際の画像本体はこのフィールドには入らず `GET/PUT/DELETE /api/memos/<id>/screenshot` でVercel Blob（`screenshots/<id>`）に読み書きされる（`screenshot` フィールド自体はこのエンドポイント経由でのみ更新され、`PUT /api/memos/<id>` の汎用更新では変更できない）。どちらもリサーチの「種」として使われる — パイプラインはこれらがあれば、まずそのスクリーンショット/URLの中身を把握してから、それを起点にリサーチする（詳細は `SKILL.md` と `.claude/agents/researcher.md` を参照）。

`researchMode` は `"once"`（単発。デフォルト）または `"recurring"`（定期的）。`recurringFrequency` は `researchMode: "recurring"` のときだけ意味を持ち、`"daily"`（毎日）/ `"weekly"`（毎週。デフォルト）/ `"monthly"`（毎月）/ `"custom"`（カスタム）のいずれか。ユーザーがメモ作成・編集フォームのボタンで選ぶ。

`recurringFrequency` が `"weekly"` のとき `recurringDayOfWeek`（0=日曜〜6=土曜、JSの`Date.getDay()`と同じ体系。任意、未指定は`null`）で曜日を、`"monthly"` のとき `recurringDayOfMonth`（1〜31。任意、未指定は`null`）で日にちを、`"custom"` のとき `recurringCustomDates`（`["YYYY-MM-DD", ...]` の配列。UIのカレンダーで複数日選択可）で実行日を1つ以上指定できる（フォーム側は選んだ頻度と無関係な項目を自動でクリアする）。`recurringTime`（`"HH:MM"` 24時間表記。任意、未指定は`null`）は頻度に関わらず希望の実行時刻を表す。いずれも「希望」であって厳密なcron指定ではない — 実際にAPIをポーリングするRoutineは6時間おきなので、その粒度でしか判定できない（詳細は`SKILL.md`の期限判定ロジックを参照）。

`"custom"` は他の3つ（`daily`/`weekly`/`monthly`）と実行タイミングの決め方が違うだけで、挙動そのものは同じ — `recurringCustomDates` に指定した日付（＋`recurringTime`）が来るたびに処理され、その都度 `history` に記録が追記される。すべての指定日を処理し終えても `active` のままメモ一覧に残り続け（`done`/`archived` にはならない）、ユーザーが後から日付を編集フォームで追加すれば再び処理対象になる。「決まった周期ではなく、任意の複数の日に忘れずにリサーチしたい」という用途向け。

`slug` はそのメモに対応する `output/` 配下のフォルダ名（パイプラインが初回処理時に決定し、`PUT /api/memos/<id>` で書き戻す。以後の実行は既存の `slug` をそのまま使い続ける）。特に定期メモでは、タイトル編集などで毎回スラグが変わって履歴が分裂しないよう、この永続化が重要。

`status` は単発メモでは `pending` → `researching` → `drafted` → `done`（または `archived`）と遷移する。定期メモでは `pending`（未処理）→（初回処理後）`active`（定期実行中。以後ずっとこの状態を保つ）と遷移し、ユーザーが手動で `done`/`archived` に変更しない限り `active` のまま処理され続ける — つまり定期メモは1回処理して終わりにならず、メモ一覧に残り続ける。パイプラインが処理対象として拾うのは、単発では `pending` のもの、定期では `pending`（初回）または `active` かつ「頻度に基づいて次の実行予定日を過ぎている」もの（`last_processed_at` と `recurringFrequency` から判定。詳細は `SKILL.md` 参照）。

処理が終わったら、そのメモの `outputTypes` に含まれる項目だけ生成し、`outputs` を `{"article": true, "video": true}` のように更新する（生成できた種類だけ `true`。キーは `article`/`video` のみで `research` は含めない）。生成物の本文自体はこの `outputs` フィールドには入らず、`PUT /api/memos/<id>/outputs/<type>` で別途Vercel Blobにアップロードされ、Web UIから記事下書き/動画構成それぞれの専用ページで読める。リポジトリの `output/<slug>/*.md`（research.mdも含む）にも同じ内容がコミットされる（バックアップ・レビュー履歴用）。

定期メモの場合はさらに、`last_processed_at` を実行時刻に更新し、`history` にその回の実行を追記する（`{"date": "YYYY-MM-DD", "outputs": {"article": true}}` の形。既存の履歴は消さず追記のみ）。生成物のアップロードも `PUT /api/memos/<id>/outputs/<type>?date=<今日の日付>` の形で行い、その日付のスナップショットとして残す（サーバー側で「最新」のコピーも自動的に同期されるので、日付なしGETは常に最新を返す）。Web UIのリサーチページでは、定期メモを開くと過去の実行が日付付きで一覧・切り替えできる。

## 定期実行（Routine）

Claude Code の Routine（スケジュールトリガー、6時間おき）が、デプロイ済みメモアプリのAPI（`GET/PUT /api/memos`）を `PIPELINE_TOKEN` で呼び出してpendingメモを取得・更新し、`/research-pipeline` スキルの内容を実行する。詳細は `.claude/skills/research-pipeline/SKILL.md` を参照。

## メモを追加する方法

デプロイ済みのURL（`docs/deployment.md` 参照）を開き、メールアドレス・パスワードでログインしてフォームから追加する。ローカルでの動作確認には Vercel CLI（`vercel dev`、事前に `vercel link` で本プロジェクトと紐付け、環境変数を `vercel env pull` で取得）を使う。

## 開発方針

- 記事・動画構成の自動公開は **行わない**。必ず人間のレビューを挟む。
- パイプラインの1回の実行につき処理するメモは最大3件（暴走・コスト膨張防止）。単発の`pending`と、期限が来た定期`active`メモを合わせた候補プール全体で3件まで。
- サブエージェントは事実の捏造を避け、根拠が薄い場合はその旨を明記する。
- メモアプリの認証情報（`ADMIN_PASSWORD` / `PIPELINE_TOKEN` / `SESSION_SECRET`）はVercelの環境変数としてのみ保持し、リポジトリにコミットしない。
