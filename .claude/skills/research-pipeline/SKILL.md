---
name: research-pipeline
description: Reads pending entries from the memo app (memo-app/data/memos.json), and for each one runs the researcher → article-writer → video-composer subagent pipeline, saving a research brief, a Note article draft, and a short-video structure under output/, then updates the memo's status and commits the results. Use when asked to process memos, run the research pipeline, or when a scheduled routine fires to check for new memo entries.
---

# Research → Note記事 → ショート動画構成 パイプライン

このスキルは、`memo-app/` で管理しているメモ（ユーザーがリサーチしてほしいトピックを書き留めたもの）を読み取り、サブエージェント（`researcher` → `article-writer` → `video-composer`）を順番に使って、リサーチ→Note記事下書き→ショート動画構成案を自動生成します。

## 手順

1. `git pull` して最新のメモ（他の場所で追加された分も含む）を取得する。
2. `memo-app/data/memos.json` を Read で読み込む。ファイルが存在しない、または `memos` が空なら、その旨を報告して終了する。
3. `status` が `"pending"` のメモを抽出する。1回の実行で処理するのは **最大3件** まで（暴走・コスト膨張防止）。`priority: "high"` を優先し、次に `created_at` が古い順。
4. 処理対象がなければ、その旨を短く報告して終了する（無理に何かを作らない）。
5. 各対象メモについて、以下を順に行う。

   a. メモの `id` と `title` から `slug` を決める（例: `2026-09-04-ai-copyright-issues`。日付は今日の日付、以降は英数字・ハイフンのみのタイトル要約）。

   b. `output/<slug>/` に保存する想定で、Agent tool（サブエージェント）を **この順番で** 呼び出す。前段の成果物（ファイル内容そのもの）を次のサブエージェントへの入力プロンプトに含めること。

      1. **researcher** エージェント — メモの `title` / `brief` / `tags` / `notes` を渡し、`output/<slug>/research.md` に research brief を書かせる。
      2. **article-writer** エージェント — 上記 research brief の内容とメモの `title` / `brief` / `notes` を渡し、`output/<slug>/article.md` に記事下書きを書かせる。
      3. **video-composer** エージェント — 上記 article（取得できなければ research brief）の内容を渡し、`output/<slug>/video-structure.md` にショート動画構成を書かせる。

   c. `memo-app/data/memos.json` を更新する:
      - 該当メモの `status` を `"drafted"` にする
      - `outputs` を `{"research": "<slug>/research.md", "article": "<slug>/article.md", "video": "<slug>/video-structure.md"}` にする（`output/` プレフィックスなし。memo-app の UI がこの形式でリンクを組み立てる）
      - `updated_at` を現在時刻（ISO8601, UTC）に更新する
      - 他のメモのフィールドは一切変更しない。JSON 全体を正しく整形して書き戻すこと。

6. すべて処理し終えたら、変更（`output/` 配下の新規ファイルと `memo-app/data/memos.json`）を git add / commit し、このセッションの指定ブランチに push する。

7. 最後に日本語で簡潔に報告する: 処理したメモのタイトル一覧、それぞれの3つの出力ファイルへのパス、そして必ず「これは下書きです。公開前に内容を確認してください」と伝える。

## 注意事項

- 記事やショート動画構成を **自動で Note や SNS に投稿・公開しない**。あくまで下書き生成と保存まで。
- サブエージェントが生成した内容に明らかな誤りや根拠のない主張がないか、コミット前に軽く目を通す。事実関係が怪しい場合は報告に明記する。
- 1回の実行で処理件数を3件に絞っているのは、無制限にリサーチ・記事生成が走ってコスト・時間が膨らむのを防ぐため。ユーザーから明示的に「全部処理して」「もっと処理して」と言われた場合はその指示に従ってよい。
- Routine（定期実行）から呼ばれる場合、会話の文脈は無いことがある。このファイルと `CLAUDE.md` だけを頼りに独立して完結できるようにすること。
