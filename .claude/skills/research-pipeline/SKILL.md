---
name: research-pipeline
description: Fetches pending entries from the deployed memo app's API (memo-app, hosted on Vercel), and for each one runs the researcher → article-writer → video-composer subagent pipeline, saving a research brief, a Note article draft, and a short-video structure under output/, then updates the memo's status via the API and commits the generated files. Use when asked to process memos, run the research pipeline, or when a scheduled routine fires to check for new memo entries.
---

# Research → Note記事 → ショート動画構成 パイプライン

このスキルは、Vercelにデプロイ済みのメモアプリ（`memo-app/`）のAPIから、ユーザーがリサーチしてほしいトピックとして書き留めたメモを取得し、サブエージェント（`researcher` → `article-writer` → `video-composer`）を順番に使って、リサーチ→Note記事下書き→ショート動画構成案を自動生成します。

メモ本体（`memos.json`）はこのリポジトリのgit管理下にはなく、Vercel Blob上にあります。読み書きは必ずデプロイ済みAPI経由で行います。

## 前提: 本番URLとトークン

- 本番URL: `docs/deployment.md` に記載（例: `https://auto-research-memo-app.vercel.app`）
- 認証: `Authorization: Bearer <PIPELINE_TOKEN>` ヘッダをすべてのAPIリクエストに付与する。トークンの値はセッション開始時の指示、またはRoutineのプロンプトに含まれている。含まれていない/失効している場合はユーザーに確認する。
- API:
  - `GET /api/memos` — 全メモの一覧を取得
  - `PUT /api/memos/<id>` — 指定メモを部分更新（`status` / `outputs` など）
  - `PUT /api/memos/<id>/outputs/<type>` — 生成物の本文（Markdown）をアップロードする（`type` は `research` / `article` / `video`）。body に生ファイル内容をそのまま送る。メモアプリのWeb UIはこれを読んでその場で表示する。

## 手順

1. `docs/deployment.md` を Read で読み、本番URLを確認する。
2. Bash（curl）で `GET {本番URL}/api/memos` を叩き、メモ一覧を取得する。例:
   ```bash
   curl -s -H "Authorization: Bearer $PIPELINE_TOKEN" "$BASE_URL/api/memos"
   ```
3. `status` が `"pending"` のメモを抽出する。1回の実行で処理するのは **最大3件** まで（暴走・コスト膨張防止）。`priority: "high"` を優先し、次に `created_at` が古い順。
4. 処理対象がなければ、その旨を短く報告して終了する（無理に何かを作らない）。
5. 各対象メモについて、以下を順に行う。

   a. メモの `id` と `title` から `slug` を決める（例: `2026-09-04-ai-copyright-issues`。日付は今日の日付、以降は英数字・ハイフンのみのタイトル要約）。

   b. `output/<slug>/` に保存する想定で、Agent tool（サブエージェント）を **この順番で** 呼び出す。前段の成果物（ファイル内容そのもの）を次のサブエージェントへの入力プロンプトに含めること。

      1. **researcher** エージェント — メモの `title` / `brief` / `tags` / `notes` を渡し、`output/<slug>/research.md` に research brief を書かせる。
      2. **article-writer** エージェント — 上記 research brief の内容とメモの `title` / `brief` / `notes` を渡し、`output/<slug>/article.md` に記事下書きを書かせる。
      3. **video-composer** エージェント — 上記 article（取得できなければ research brief）の内容を渡し、`output/<slug>/video-structure.md` にショート動画構成を書かせる。

   c. 生成した3ファイルの中身を、それぞれメモアプリにアップロードする（メモアプリのWeb UIから直接読めるようにするため）:
      ```bash
      curl -s -X PUT -H "Authorization: Bearer $PIPELINE_TOKEN" -H "Content-Type: text/markdown" \
        --data-binary @output/<slug>/research.md "$BASE_URL/api/memos/<id>/outputs/research"
      curl -s -X PUT -H "Authorization: Bearer $PIPELINE_TOKEN" -H "Content-Type: text/markdown" \
        --data-binary @output/<slug>/article.md "$BASE_URL/api/memos/<id>/outputs/article"
      curl -s -X PUT -H "Authorization: Bearer $PIPELINE_TOKEN" -H "Content-Type: text/markdown" \
        --data-binary @output/<slug>/video-structure.md "$BASE_URL/api/memos/<id>/outputs/video"
      ```

   d. アップロードが終わったら、`PUT {本番URL}/api/memos/<id>` を叩いてメモの状態を更新する:
      ```bash
      curl -s -X PUT -H "Authorization: Bearer $PIPELINE_TOKEN" -H "Content-Type: application/json" \
        -d '{"status":"drafted","outputs":{"research":true,"article":true,"video":true}}' \
        "$BASE_URL/api/memos/<id>"
      ```
      （`outputs` の値は真偽値。アップロードに成功した種類だけ `true` にする。Web UIはこのキーの有無で「見る」ボタンの表示を判断する）

6. すべて処理し終えたら、`output/` 配下の新規ファイルを git add / commit し、このセッションの指定ブランチに push する（リポジトリ内にも下書きの記録を残すため。`memos.json` はAPI経由で既に更新済みなのでコミット対象ではない）。

7. 最後に日本語で簡潔に報告する: 処理したメモのタイトル一覧、それぞれの3つの出力ファイルへのパス、そして必ず「これは下書きです。公開前に内容を確認してください」と伝える。

## 注意事項

- 記事やショート動画構成を **自動で Note や SNS に投稿・公開しない**。あくまで下書き生成と保存まで。
- サブエージェントが生成した内容に明らかな誤りや根拠のない主張がないか、コミット前に軽く目を通す。事実関係が怪しい場合は報告に明記する。
- 1回の実行で処理件数を3件に絞っているのは、無制限にリサーチ・記事生成が走ってコスト・時間が膨らむのを防ぐため。ユーザーから明示的に「全部処理して」「もっと処理して」と言われた場合はその指示に従ってよい。
- APIが401を返す場合、`PIPELINE_TOKEN` が間違っているか失効している。推測で再試行せず、ユーザーに報告する。
- Routine（定期実行）から呼ばれる場合、会話の文脈は無いことがある。このファイルと `CLAUDE.md` / `docs/deployment.md` だけを頼りに独立して完結できるようにすること。
