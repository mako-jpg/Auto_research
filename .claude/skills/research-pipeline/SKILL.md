---
name: research-pipeline
description: Fetches pending entries from the deployed memo app's API (memo-app, hosted on Vercel), and for each one runs the researcher agent (always) followed by article-writer and/or video-composer (whichever the memo's outputTypes selects), saving a research brief, and a Note article draft and/or short-video structure, under output/, then updates the memo's status via the API and commits the generated files. Use when asked to process memos, run the research pipeline, or when a scheduled routine fires to check for new memo entries.
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
  - `PUT /api/memos/<id>/outputs/<type>` — 生成物の本文（Markdown）をアップロードする（`type` は `article` / `video` のみ。**`research` は含まない** — リサーチはパイプラインが常に内部的に行う下調べであり、Web UI上の生成物としては扱わない）。body に生ファイル内容をそのまま送る。メモアプリのWeb UIはこれを読んでその場で表示する。
- 各メモの `outputTypes` フィールド（`["article"]` や `["article","video"]` など）が、そのメモについて生成すべき項目を指定する。ユーザーがメモ作成・編集画面のボタンで選ぶ。**リサーチ（researcherエージェント）は選択肢に関係なく毎回必ず実行する**（記事・動画の元になる下調べのため）。

## 手順

0. リポジトリへの書き込み（push）権限がまだ無い状態で起動した場合（例: Routineがgit sourceを指定せずにセッションを起動した場合）は、まず `mcp__Claude_Code_Remote__add_repo`（`owner: "mako-jpg"`, `repo: "Auto_research"`, `access: "push"`）でpush可能な状態のクローンを取得し、`mcp__Claude_Code_Remote__register_repo_root` でルートディレクトリを登録してから以降の作業を行う。このリポジトリは `claude/research-article-automation-u3efhq` という1つのブランチのみで運用されている（デフォルトブランチ＝本番ブランチ）。この手順を飛ばすと、API経由の更新（メモのstatus更新・生成物アップロード）は成功するのに、最後のgit commit/pushだけが失敗する（push権限が無いため）という分かりにくい失敗の仕方をするので注意。

1. `docs/deployment.md` を Read で読み、本番URLを確認する。
2. Bash（curl）で `GET {本番URL}/api/memos` を叩き、メモ一覧を取得する。例:
   ```bash
   curl -s -H "Authorization: Bearer $PIPELINE_TOKEN" "$BASE_URL/api/memos"
   ```
3. `status` が `"pending"` のメモを抽出する。1回の実行で処理するのは **最大3件** まで（暴走・コスト膨張防止）。`priority` が大きい（5に近い）ものを優先し、次に `created_at` が古い順。
4. 処理対象がなければ、その旨を短く報告して終了する（無理に何かを作らない）。
5. 各対象メモについて、以下を順に行う。

   a. メモの `id` と `title` から `slug` を決める（例: `2026-09-04-ai-copyright-issues`。日付は今日の日付、以降は英数字・ハイフンのみのタイトル要約）。

   b. メモの `outputTypes` を見て、`article` / `video` のうちどれを生成するか決める（フィールドが無い古いメモは両方とも生成する）。

   c. `output/<slug>/` に保存する想定で、Agent tool（サブエージェント）を **この順番で** 呼び出す。前段の成果物（ファイル内容そのもの）を次のサブエージェントへの入力プロンプトに含めること。

      1. **researcher** エージェント — `outputTypes` の内容に関わらず**必ず**呼び出す。メモの `title` / `brief` / `categories` を渡し、`output/<slug>/research.md` に research brief を書かせる（記事・動画の元ネタ。Web UIにはアップロードしない、リポジトリへの記録用）。
      2. **article-writer** エージェント — `outputTypes` に `"article"` が含まれる場合のみ呼び出す。上記 research brief の内容とメモの `title` / `brief` を渡し、`output/<slug>/article.md` に記事下書きを書かせる。
      3. **video-composer** エージェント — `outputTypes` に `"video"` が含まれる場合のみ呼び出す。article-writer を呼んでいれば article の内容を、呼んでいなければ research brief の内容を渡し、`output/<slug>/video-structure.md` にショート動画構成を書かせる。

   d. 生成した（`research.md` 以外の）ファイルの中身を、それぞれメモアプリにアップロードする（メモアプリのWeb UIから直接読めるようにするため。`research.md` はアップロードしない）:
      ```bash
      # article-writer を呼んだ場合
      curl -s -X PUT -H "Authorization: Bearer $PIPELINE_TOKEN" -H "Content-Type: text/markdown" \
        --data-binary @output/<slug>/article.md "$BASE_URL/api/memos/<id>/outputs/article"
      # video-composer を呼んだ場合
      curl -s -X PUT -H "Authorization: Bearer $PIPELINE_TOKEN" -H "Content-Type: text/markdown" \
        --data-binary @output/<slug>/video-structure.md "$BASE_URL/api/memos/<id>/outputs/video"
      ```

   e. アップロードが終わったら、`PUT {本番URL}/api/memos/<id>` を叩いてメモの状態を更新する。`outputs` には実際に生成・アップロードした種類だけを `true` で含める（`research` は含めない）:
      ```bash
      curl -s -X PUT -H "Authorization: Bearer $PIPELINE_TOKEN" -H "Content-Type: application/json" \
        -d '{"status":"drafted","outputs":{"article":true,"video":true}}' \
        "$BASE_URL/api/memos/<id>"
      ```
      （Web UIはこのキーの有無で「見る」ボタンの表示を判断する）

6. すべて処理し終えたら、`output/` 配下の新規ファイルを git add / commit し、`git push origin claude/research-article-automation-u3efhq` で明示的にこのブランチへ push する（リポジトリ内にも下書きの記録を残すため。`memos.json` はAPI経由で既に更新済みなのでコミット対象ではない）。push が失敗した場合は理由（権限不足など）を最終報告に必ず含める。

7. 最後に日本語で簡潔に報告する: 処理したメモのタイトル一覧、それぞれ生成した出力ファイルへのパス（`research.md` は毎回、`article.md`/`video-structure.md` はそのメモの `outputTypes` で選ばれたものだけ）、そして必ず「これは下書きです。公開前に内容を確認してください」と伝える。

## 注意事項

- 記事やショート動画構成を **自動で Note や SNS に投稿・公開しない**。あくまで下書き生成と保存まで。
- サブエージェントが生成した内容に明らかな誤りや根拠のない主張がないか、コミット前に軽く目を通す。事実関係が怪しい場合は報告に明記する。
- 1回の実行で処理件数を3件に絞っているのは、無制限にリサーチ・記事生成が走ってコスト・時間が膨らむのを防ぐため。ユーザーから明示的に「全部処理して」「もっと処理して」と言われた場合はその指示に従ってよい。
- APIが401を返す場合、`PIPELINE_TOKEN` が間違っているか失効している。推測で再試行せず、ユーザーに報告する。
- Routine（定期実行）から呼ばれる場合、会話の文脈は無いことがある。このファイルと `CLAUDE.md` / `docs/deployment.md` だけを頼りに独立して完結できるようにすること。
