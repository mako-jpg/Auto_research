# Auto_research

個人のリサーチ → Note記事下書き → ショート動画構成、を自動化するプロジェクト。

## 全体像

1. **`memo-app/`** — Vercelにデプロイして使う自作Webメモアプリ（Vercel Serverless Functions + Vercel Blob）。「リサーチしてほしいトピック」を記録する。メモ本体はVercel Blob上のJSON（`memos.json`）に保存される（このリポジトリのgit管理下ではない）。デプロイ先URLは `docs/deployment.md` を参照。
2. **`.claude/agents/`** — パイプラインで使うサブエージェント定義。
   - `researcher` — Web検索でトピックを調査し、出典付きのリサーチブリーフを作る
   - `article-writer` — リサーチブリーフからNote記事の下書きを書く
   - `video-composer` — 記事からショート動画（Shorts/TikTok/Reels想定）の構成・台本を作る
3. **`.claude/skills/research-pipeline/SKILL.md`** — デプロイ済みメモアプリのAPIからメモを取得し、3つのサブエージェントを順番に呼び出して `output/` 配下に成果物を作るオーケストレーションスキル。手動なら `/research-pipeline` として呼び出せる。
4. **`output/<slug>/`** — 生成された `research.md` / `article.md` / `video-structure.md`。すべて **下書き**。このリポジトリにコミットされる。自動公開はしない。

## メモアプリのアーキテクチャ（`memo-app/`）

- `api/` — Vercel Serverless Functions（Node.js）。`login.js`（人間のログイン）/ `logout.js` / `memos.js`（一覧取得・作成）/ `memos/[id].js`（更新・削除）。
- `lib/store.js` — Vercel Blob（`memos.json`）への読み書き。
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
      "tags": ["AI", "マーケティング"],
      "priority": "normal",
      "status": "pending",
      "notes": "任意の補足",
      "created_at": "ISO8601",
      "updated_at": "ISO8601",
      "outputs": {}
    }
  ]
}
```

`status` は `pending` → `researching` → `drafted` → `done`（または `archived`）と遷移する。パイプラインは `pending` のものだけを処理し、完了したら `drafted` にして `outputs` にファイルパス（`output/` 配下、リポジトリ内）を記録する。

## 定期実行（Routine）

Claude Code の Routine（スケジュールトリガー、6時間おき）が、デプロイ済みメモアプリのAPI（`GET/PUT /api/memos`）を `PIPELINE_TOKEN` で呼び出してpendingメモを取得・更新し、`/research-pipeline` スキルの内容を実行する。詳細は `.claude/skills/research-pipeline/SKILL.md` を参照。

## メモを追加する方法

デプロイ済みのURL（`docs/deployment.md` 参照）を開き、メールアドレス・パスワードでログインしてフォームから追加する。ローカルでの動作確認には Vercel CLI（`vercel dev`、事前に `vercel link` で本プロジェクトと紐付け、環境変数を `vercel env pull` で取得）を使う。

## 開発方針

- 記事・動画構成の自動公開は **行わない**。必ず人間のレビューを挟む。
- パイプラインの1回の実行につき処理するメモは最大3件（暴走・コスト膨張防止）。
- サブエージェントは事実の捏造を避け、根拠が薄い場合はその旨を明記する。
- メモアプリの認証情報（`ADMIN_PASSWORD` / `PIPELINE_TOKEN` / `SESSION_SECRET`）はVercelの環境変数としてのみ保持し、リポジトリにコミットしない。
