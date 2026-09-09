---
name: research-pipeline
description: Fetches pending entries (plus due recurring entries whose researchMode is "recurring", plus any memo flagged revisionRequested regardless of status/mode) from the deployed memo app's API (memo-app, hosted on Vercel), and for each one runs the researcher agent (always — it produces the easy-to-read research writeup the user reads directly, and is also the input the other two agents draft from) followed by article-writer and/or video-composer (whichever the memo's outputTypes selects), saving the research writeup, and a Note article draft and/or short-video structure, under output/, then uploads whichever of research/article/video are in the memo's outputTypes to the app so the user can read them there, updates the memo's status/history via the API, and commits the generated files. A memo may seed the researcher with an attached screenshot image and/or a source URL (Instagram/X/YouTube/etc.) instead of or alongside its text brief, in which case the researcher identifies what that seed shows first and researches broadly around it. Recurring memos stay active and are reprocessed each time their frequency comes due, building up a dated history instead of a single one-off draft. A memo flagged revisionRequested (via the app's "修正をリクエスト" button, with a user-written note on what to fix) gets its existing research re-invoked in a targeted revision mode — reusing what's already correct and only re-researching what the note flags — rather than a fresh full re-research. Every run also syncs any memo flagged obsidianSave (toggled via a "save to Obsidian" button in the app's output page) into an obsidian/<slug>.md note in this repo, regardless of whether that memo had new research this run. Use when asked to process memos, run the research pipeline, or when a scheduled routine fires to check for new or due memo entries.
---

# Research → Note記事 → ショート動画構成 パイプライン

このスキルは、Vercelにデプロイ済みのメモアプリ（`memo-app/`）のAPIから、ユーザーがリサーチしてほしいトピックとして書き留めたメモを取得し、サブエージェント（`researcher` → `article-writer` → `video-composer`）を順番に使って、リサーチ結果（ユーザー本人がそのまま読んでわかりやすい文章）→Note記事下書き→ショート動画構成案を自動生成します。リサーチ結果はもはや裏方の下調べだけではなく、ユーザーが直接読む主要な成果物のひとつです。

メモ本体（`memos.json`）はこのリポジトリのgit管理下にはなく、Vercel Blob上にあります。読み書きは必ずデプロイ済みAPI経由で行います。

## 前提: 本番URLとトークン

- 本番URL: `docs/deployment.md` に記載（例: `https://auto-research-memo-app.vercel.app`）
- 認証: `Authorization: Bearer <PIPELINE_TOKEN>` ヘッダをすべてのAPIリクエストに付与する。トークンの値はセッション開始時の指示、またはRoutineのプロンプトに含まれている。含まれていない/失効している場合はユーザーに確認する。
- API:
  - `GET /api/memos` — 全メモの一覧を取得
  - `PUT /api/memos/<id>` — 指定メモを部分更新（`status` / `outputs` / `history` / `last_processed_at` / `slug` など）
  - `PUT /api/memos/<id>/outputs/<type>` — 生成物の本文（Markdown）をアップロードする（`type` は `research` / `article` / `video`）。body に生ファイル内容をそのまま送る。メモアプリのWeb UIはこれを読んでその場で表示する。**定期メモの場合はクエリパラメータ `?date=YYYY-MM-DD` を付けて、その回の実行日付でアップロードする**（サーバー側で「最新」のコピーも自動的に同期されるので、通常のGET/日付なしのアップロードは常に最新を指す）。GETも同様に `?date=` で過去分を個別に取得できる。
  - `GET /api/memos/<id>/screenshot` — メモに添付されたスクリーンショット画像のバイナリを取得する（`memo.screenshot` が `true` のときだけ存在する）。
- 各メモの `outputTypes` フィールド（`["research"]` や `["research","article","video"]` など）が、そのメモについてWeb UIで**表示・アップロードする**項目を指定する。ユーザーがメモ作成・編集画面のボタンで選ぶ（デフォルトは3つとも選択済み）。**ただし researcher エージェント自体は `outputTypes` の内容に関わらず毎回必ず実行する**（`article`/`video` の元ネタとして常に必要なため）。`outputTypes` が制御するのは「生成された `research.md`/`article.md`/`video-structure.md` のうち、どれをメモアプリにアップロードして見られるようにするか」と「`article`/`video` をそもそも生成するか」の2つ（詳しくは下記手順を参照）。
- 各メモの `researchMode` フィールドが `"once"`（単発）か `"recurring"`（定期的）かを表す。定期的の場合 `recurringFrequency` が `"daily"`/`"weekly"`/`"monthly"`/`"custom"` のいずれかで頻度を表す。加えて、`recurringFrequency: "weekly"` のとき `recurringDayOfWeek`（0=日曜〜6=土曜。任意、`null`なら指定なし）、`"monthly"` のとき `recurringDayOfMonth`（1〜31。任意、`null`なら指定なし）で曜日・日にちを、`"custom"` のとき `recurringCustomDates`（`["YYYY-MM-DD", ...]` の配列。UIのカレンダーで複数選択可）で実行日を1つ以上、`recurringTime`（`"HH:MM"`。任意、`null`なら指定なし）で希望の実行時刻を指定できる。**`"custom"` は他の3つ（daily/weekly/monthly）と実行タイミングの決め方が違うだけ** — 決まった周期ではなく `recurringCustomDates` の明示的な日付リストで次回実行日を管理する。それ以外の挙動（`active`のまま残り続ける、`history`に実行ごとの記録が蓄積する、`slug`を固定する）は他の定期メモと同じで、配列内の日付を1つずつ、期限が来るたびに処理していく（詳しくは下記手順を参照）。
- 各メモは `sourceUrl`（参照URL。InstagramやX、YouTubeの投稿URLなど）と `screenshot`（スクリーンショット画像が添付されているかの真偽値）を持つ場合がある。どちらか片方だけ・両方・どちらも無し、いずれもあり得る。researcherエージェントへの入力に必ず含めること（下記手順参照）。
- 各メモは `obsidianSave`（真偽値。デフォルト`false`）を持つ。ユーザーがメモアプリの生成物ページ（リサーチ結果の表示画面）で「Obsidianに保存」ボタンを押すと`true`になる。`true`のメモは、処理対象かどうかに関わらず**毎回のパイプライン実行時に**`obsidian/<slug>.md`としてこのリポジトリに同期される（詳細は下記手順6）。
- 各メモは `revisionRequested`（真偽値。デフォルト`false`）と `revisionNote`（文字列またはnull）を持つ。ユーザーが生成物ページの「リサーチ結果」タブで「修正をリクエスト」ボタンを押し、何を直してほしいか一言書くと `revisionRequested: true` になり、その文章が `revisionNote` に入る。`true`のメモは`status`や`researchMode`を問わず処理候補プールに加わり（詳細は下記手順3）、researcherエージェントが既存の内容を活かしつつ修正リクエストに沿って狙い撃ちで再調査する「修正モード」で処理される（詳細は下記手順5、および `.claude/agents/researcher.md`）。処理が終わると`revisionRequested`は`false`に戻る。

## 手順

0. リポジトリへの書き込み（push）権限がまだ無い状態で起動した場合（例: Routineがgit sourceを指定せずにセッションを起動した場合）は、まず `mcp__Claude_Code_Remote__add_repo`（`owner: "mako-jpg"`, `repo: "Auto_research"`, `access: "push"`）でpush可能な状態のクローンを取得し、`mcp__Claude_Code_Remote__register_repo_root` でルートディレクトリを登録してから以降の作業を行う。このリポジトリは `claude/research-article-automation-u3efhq` という1つのブランチのみで運用されている（デフォルトブランチ＝本番ブランチ）。この手順を飛ばすと、API経由の更新（メモのstatus更新・生成物アップロード）は成功するのに、最後のgit commit/pushだけが失敗する（push権限が無いため）という分かりにくい失敗の仕方をするので注意。

1. `docs/deployment.md` を Read で読み、本番URLを確認する。
2. Bash（curl）で `GET {本番URL}/api/memos` を叩き、メモ一覧を取得する。例:
   ```bash
   curl -s -H "Authorization: Bearer $PIPELINE_TOKEN" "$BASE_URL/api/memos"
   ```
3. 処理候補を集める（単発・定期・修正リクエストを合わせて1つのプールにする）。
   - `status` が `"pending"` の単発（`researchMode: "once"`）メモ。無条件で対象。
   - `status` が `"pending"`（初回）または `"active"` で `researchMode: "recurring"` のメモのうち、**次の実行予定日を過ぎているもの**（＝期限が来た定期メモ）。判定方法は `recurringFrequency` によって異なる。
     - `daily`/`weekly`/`monthly` の場合、判定は次の2段階（両方満たしたら対象）:
       1. **経過時間チェック**（同じ実行が短期間に重複しないためのガード）: `last_processed_at` が `null`（まだ一度も処理されていない）なら即クリア。そうでなければ、`recurringFrequency` に応じた最小間隔（`daily`＝20時間、`weekly`＝6日、`monthly`＝27日）以上経過していること。
       2. **曜日・日にち・時刻チェック**（`recurringDayOfWeek`/`recurringDayOfMonth`/`recurringTime` が設定されている場合のみ、追加で満たす必要がある。`null`のものはチェックをスキップ＝いつでも良い）:
          - `recurringFrequency: "weekly"` かつ `recurringDayOfWeek` が設定されている → 今日の曜日（0=日曜〜6=土曜）が一致すること。
          - `recurringFrequency: "monthly"` かつ `recurringDayOfMonth` が設定されている → 今日の日にちが一致すること（その月にその日が存在しない場合は、その月の最終日を代わりに一致とみなす。例: 31日指定で2月なら28日/29日を最終実行日とする）。
          - `recurringTime` が設定されている → 現在時刻がその時刻以降であること（例: `09:00` 指定なら、9時台以降のRoutine実行で初めて対象になる）。
          時刻判定は日本時間（JST, UTC+9）を基準にする。厳密なcronではなく「その日の、その時刻以降に最初にRoutineが動いたとき」に処理される程度の精度でよい（Routine自体が1日3回・JST 9:33/15:33/21:33にしか動かないので、それ以上の精度は出せない。深夜〜早朝には動かない）。bashで今日のJST基準の曜日・日にち・時刻を得る例:
          ```bash
          TZ=Asia/Tokyo date +%u  # 曜日: 1=月〜7=日（recurringDayOfWeekの0=日曜始まりとはズレるので変換に注意。%uの7を0に読み替える）
          TZ=Asia/Tokyo date +%d  # 日にち: 01〜31
          TZ=Asia/Tokyo date +%H:%M  # 現在時刻
          ```
     - `custom` の場合: `recurringCustomDates` 配列の中に、まだ `history` に記録されていない（＝その日付の実行記録が `history` の要素に無い）日付があり、かつその日付＋`recurringTime`（未指定なら`00:00`扱い、JST基準）を**過ぎているもの**が1つ以上あれば対象。該当する未処理日付が複数ある場合、その回は**最も古い（早い）ものだけ**を処理対象日とする（残りは次回以降のRoutine実行で処理する）。
   - `revisionRequested === true` のメモ。`status`・`researchMode`を問わず対象（`slug`が設定されている＝一度は処理済みのメモのはずなので、`slug`が無いものは実質発生しない）。以下「修正リクエスト」と呼ぶ（他の2種類は「通常処理」と呼ぶ）。
   - 上記3種類のプール全体から **最大3件** まで（暴走・コスト膨張防止）。修正リクエストはユーザーからの明示的なフィードバックなので優先的に枠へ入れ、残りの枠を`priority`が大きい（5に近い）ものから、次に「単発pendingは`created_at`が古い順」「定期activeは次の実行予定日を過ぎている度合いが大きい順」を目安に埋める。
4. 処理対象がなければ、その旨（「単発の未処理も、期限が来た定期メモも無し」等）を記録する（無理に何かを作らない）。ただし**まだここで終了しない** — 手順6のObsidian同期は処理対象の有無と無関係に毎回行うため、そのまま手順5を飛ばして手順6に進む。
5. 各対象メモについて、以下を順に行う。**修正リクエスト**（`revisionRequested`）と**通常処理**（単発/定期の新規・期限到来）とで a・b・e・g の内容が一部変わる。c・d・f は共通。

   a. `slug` を決める。
      - **修正リクエスト**の場合: 既存の `slug` をそのまま使う（新規に決めない）。
      - **通常処理**の場合: メモに既に `slug` フィールドが設定されていれば（＝2回目以降の定期実行）、**それをそのまま再利用する**（タイトルが編集されていても変えない — 変えると履歴フォルダが分裂する）。まだ無ければ新規に決める:
        - 単発（`researchMode: "once"`）: 従来通り `<today>-<title-slug>`（例: `2026-09-04-ai-copyright-issues`。日付は今日の日付、以降は英数字・ハイフンのみのタイトル要約）。
        - 定期（`researchMode: "recurring"`）の `daily`/`weekly`/`monthly`/`custom` すべて: 日付を含めない安定した形 `<title-slug>`（例: `ai-copyright-issues-weekly`）。以後の実行でずっとこの `slug` を使い続けるので、`PUT /api/memos/<id>` で `{"slug": "<決めたslug>"}` を送って必ず永続化しておく（`custom` も複数の日付にわたって繰り返し処理されるため、他の定期メモと同様に安定させる必要がある）。

   b. 出力先ディレクトリを決める。
      - **修正リクエスト**の場合: 新しいディレクトリは作らず、**既存の最新ディレクトリ**をそのまま使う。単発なら `output/<slug>/`。定期なら `output/<slug>/<date>/`で、`<date>`は`history`配列のうち最新（日付が最も新しい）のエントリの`date`。
      - **通常処理**の場合: 単発なら `output/<slug>/`、定期（`daily`/`weekly`/`monthly`/`custom` すべて）なら `output/<slug>/<date>/`。`<date>` は `daily`/`weekly`/`monthly` の場合は今日の日付（`YYYY-MM-DD`）、`custom` の場合は手順3で選んだ「今回処理する対象日」（`recurringCustomDates` のうち期限が来ている最古の未処理日付）。
      以降の手順の `output/<slug>/` はこのディレクトリを指す。

   c. メモの `outputTypes` を見て、`article` / `video` のうちどれを生成するか決める（`research` は常に生成するので判定不要。フィールドが無い古いメモは3つとも生成する）。

   d. `memo.screenshot` が `true` の場合、`GET {本番URL}/api/memos/<id>/screenshot` で画像を取得し、`output/<slug>/screenshot.<拡張子>` に保存する（拡張子はレスポンスの `Content-Type` から判断: `image/png`→`png`、`image/jpeg`→`jpg`、それ以外は `png` として保存）:
      ```bash
      curl -s -H "Authorization: Bearer $PIPELINE_TOKEN" "$BASE_URL/api/memos/<id>/screenshot" -o output/<slug>/screenshot.png
      ```
      このファイルパスは次の researcher 呼び出しに渡す（researcherがReadツールで画像を見る）。

   e. 上記ディレクトリに保存する想定で、Agent tool（サブエージェント）を **この順番で** 呼び出す。前段の成果物（ファイル内容そのもの）を次のサブエージェントへの入力プロンプトに含めること。

      1. **researcher** エージェント — `outputTypes` の内容に関わらず**必ず**呼び出す。
         - **修正リクエスト**の場合: 手順bのディレクトリにある既存の `research.md` をReadで読み、その全文と `memo.revisionNote`（と `memo.title`）を渡し、修正モードで動くよう明示的に指示する（`.claude/agents/researcher.md`の「修正モード」参照）。同じ内容をゼロから調べ直すのではなく、修正リクエストが指す部分だけ狙い撃ちで再調査し、それ以外は既存の内容を活かすよう伝えること。結果は同じ `research.md` に上書きする。
         - **通常処理**の場合: メモの `title` / `brief` / `categories` に加えて、あれば手順dで保存したスクリーンショットのファイルパスと `sourceUrl`（画像・URLどちらも無ければ渡さなくてよい）を渡し、`research.md` に、ユーザー本人がそのまま読んで頭に入りやすい平易な文章のリサーチ結果を書かせる。researcherはスクリーンショット/URLがあればまずその内容を把握し、そこを起点に周辺情報まで広く深く調べる（詳細は `.claude/agents/researcher.md` 参照）。`brief` が空でもスクリーンショット/URLがあれば処理を続けてよい（両方無くbriefだけの場合は従来通り）。

         どちらの場合も、`research.md` は `outputTypes` に `research` が含まれていればWeb UIにもアップロードされる主要な成果物になる。含まれていなくても article/video の元ネタとして必ず必要。
      2. **article-writer** エージェント — `outputTypes` に `"article"` が含まれる場合のみ呼び出す。上記 research brief の内容とメモの `title` / `brief` を渡し、`article.md` に記事下書きを書かせる。
      3. **video-composer** エージェント — `outputTypes` に `"video"` が含まれる場合のみ呼び出す。article-writer を呼んでいれば article の内容を、呼んでいなければ research brief の内容を渡し、`video-structure.md` にショート動画構成を書かせる。

   f. 生成した（`screenshot.<拡張子>` 以外の）ファイルのうち、そのメモの `outputTypes` に含まれる種類だけを、それぞれメモアプリにアップロードする（メモアプリのWeb UIから直接読めるようにするため。`research.md` も `outputTypes` に `"research"` が含まれていればアップロード対象。スクリーンショットはアップロードしない — 元々Web UI側にあるものを取得しただけ）。**定期メモ（`daily`/`weekly`/`monthly`/`custom`、修正リクエストも含む）の場合は `?date=<date>` を付ける**（単発は付けない）。`<date>` は手順bで決めたものと同じ（修正リクエストの場合は既存の最新日付。`custom`の通常処理の場合は今日の日付ではなく処理対象の日付）:
      ```bash
      # research.md をアップロードする例（単発の場合）
      curl -s -X PUT -H "Authorization: Bearer $PIPELINE_TOKEN" -H "Content-Type: text/markdown" \
        --data-binary @output/<slug>/research.md "$BASE_URL/api/memos/<id>/outputs/research"
      # article.md をアップロードする例（単発の場合）
      curl -s -X PUT -H "Authorization: Bearer $PIPELINE_TOKEN" -H "Content-Type: text/markdown" \
        --data-binary @output/<slug>/article.md "$BASE_URL/api/memos/<id>/outputs/article"
      # video-structure.md をアップロードする例（定期の場合、今日が2026-09-07）
      curl -s -X PUT -H "Authorization: Bearer $PIPELINE_TOKEN" -H "Content-Type: text/markdown" \
        --data-binary @output/<slug>/2026-09-07/video-structure.md "$BASE_URL/api/memos/<id>/outputs/video?date=2026-09-07"
      ```

   g. アップロードが終わったら、`PUT {本番URL}/api/memos/<id>` を叩いてメモの状態を更新する。
      - **修正リクエスト**の場合: これは「新しい実行」ではなく既存の内容の手直しなので、`status`・`history`・`last_processed_at`・`recurringCustomDates`は一切変更しない。`revisionRequested`を`false`に、`revisionNote`を`null`に戻すだけでよい（`outputs`も基本的に変更不要 — 既にどれも`true`のはず）:
        ```bash
        curl -s -X PUT -H "Authorization: Bearer $PIPELINE_TOKEN" -H "Content-Type: application/json" \
          -d '{"revisionRequested":false,"revisionNote":null}' \
          "$BASE_URL/api/memos/<id>"
        ```
      - **通常処理**の場合: `outputs` には実際に生成・アップロードした種類だけを `true` で含める（`research`/`article`/`video` のうち `outputTypes` に含まれていたもの）。
        - **単発**の場合: 一度きりの実行として終端する。
          ```bash
          curl -s -X PUT -H "Authorization: Bearer $PIPELINE_TOKEN" -H "Content-Type: application/json" \
            -d '{"status":"drafted","outputs":{"research":true,"article":true,"video":true}}' \
            "$BASE_URL/api/memos/<id>"
          ```
        - **定期（`daily`/`weekly`/`monthly`/`custom` すべて）**の場合: `status` は `"active"` にし（`done`/`archived`にはしない — ユーザーが手動でアーカイブしない限り継続する）、`last_processed_at` を今の時刻に、`history` は**既存の配列にその回の記録を追記**したものにする（GETで取得した既存の `history` 配列 + 今回分。上書きではなく追記）。`history` に追記する要素の `date` は、`daily`/`weekly`/`monthly` なら今日の日付、`custom` なら手順bで決めた処理対象日:
          ```bash
          curl -s -X PUT -H "Authorization: Bearer $PIPELINE_TOKEN" -H "Content-Type: application/json" \
            -d '{"status":"active","outputs":{"research":true,"article":true,"video":true},"last_processed_at":"2026-09-07T09:00:00Z","history":[...既存の履歴..., {"date":"2026-09-07","outputs":{"research":true,"article":true,"video":true}}]}' \
            "$BASE_URL/api/memos/<id>"
          ```
          （`custom` の場合、`recurringCustomDates` 配列自体は変更しない — 処理済みかどうかは `history` に同じ `date` の記録があるかどうかで判定する）
      （Web UIはこの `outputs` のキーの有無で各タブ（リサーチ結果/記事下書き/動画構成）の表示を、`history` の中身で過去の実行を日付付きで一覧表示する）

6. **Obsidianへの保存を同期する**（処理対象の有無と無関係に、パイプラインを実行するたびに毎回行う）。
   a. `GET {本番URL}/api/memos` を叩き直して最新のメモ一覧を取得する（手順5で処理したメモの`slug`/`history`/`status`の更新を反映させるため）。
   b. `obsidianSave === true` のメモをすべて対象にする（`status`や処理タイミングは問わない）。対象が1件もなければこの手順は何もせず手順7へ進む。
   c. 各対象メモについて、出力ディレクトリを特定する: 単発（`researchMode: "once"`）なら`output/<slug>/`。定期（`researchMode: "recurring"`）なら`output/<slug>/<date>/`で、`<date>`は`history`配列のうち最新（日付が最も新しい）のエントリの`date`。定期メモで`history`がまだ空（一度も処理されていない）の場合はそのメモをスキップする（同期する内容がまだ無いため）。
   d. そのディレクトリにある`research.md`・`article.md`・`video-structure.md`のうち実際に存在するものをReadで読む。
   e. 以下の形式で`obsidian/<slug>.md`を作成（既にあれば上書き）する。Obsidianでタグ・プロパティとして扱えるよう、YAMLフロントマターを付ける:
      ```markdown
      ---
      title: "<memo.title>"
      tags: [リサーチメモ<memo.categoriesの各要素を", <カテゴリ名>"の形で追加>]
      status: <memo.status>
      created: <memo.created_at>
      source_url: <memo.sourceUrl。無ければこの行自体を省略>
      memo_id: <memo.id>
      ---

      # <memo.title>

      <research.mdの内容。存在しなければこのセクションごと省略>

      ## 記事下書き

      <article.mdの内容。存在しなければこのセクションごと省略>

      ## 動画構成

      <video-structure.mdの内容。存在しなければこのセクションごと省略>
      ```
      （`obsidian/`はこのリポジトリ内の新しいトップレベルフォルダ。ユーザーはこのリポジトリをローカルにクローン/pullし、ObsidianのVault（またはVault内のサブフォルダ）としてこの`obsidian/`フォルダを使う想定。`git pull`するたびに新しく保存されたメモがObsidian側に反映される）。
   f. `obsidianSave`を`false`に戻したりはしない（ユーザーが明示的にトグルを外すまで保存対象のままにする。以後のパイプライン実行でも同じ`obsidian/<slug>.md`が最新内容で上書きされ続ける）。

7. すべて処理し終えたら、`output/`配下の新規ファイル（`.md`のみ。**`screenshot.<拡張子>`はリポジトリにコミットしない** — 元データはVercel Blob側に既にあり、画像バイナリを毎回コミットするとリポジトリが肥大化するため、処理が終わったら削除するかgit addの対象から外す）と、手順6で書いた`obsidian/`配下の変更を git add / commit し、`git push origin claude/research-article-automation-u3efhq` で明示的にこのブランチへ push する（リポジトリ内にも下書きの記録を残すため。`memos.json`はAPI経由で既に更新済みなのでコミット対象ではない）。push が失敗した場合は理由（権限不足など）を最終報告に必ず含める。

8. 最後に日本語で簡潔に報告する: 処理したメモのタイトル一覧（単発/定期/修正リクエストの別も添える）、それぞれ生成した出力ファイルへのパス（`research.md`は毎回生成、`article.md`/`video-structure.md`はそのメモの`outputTypes`で選ばれたものだけ）、修正リクエストを処理した場合はどこを直したかの一言（researcherの返答から拾う）、Obsidianへ同期したメモがあればそのタイトル一覧、そして必ず「これは下書きです。公開前に内容を確認してください」と伝える。

## 注意事項

- 記事やショート動画構成を **自動で Note や SNS に投稿・公開しない**。あくまで下書き生成と保存まで。
- サブエージェントが生成した内容に明らかな誤りや根拠のない主張がないか、コミット前に軽く目を通す。事実関係が怪しい場合は報告に明記する。
- 1回の実行で処理件数を3件に絞っているのは、無制限にリサーチ・記事生成が走ってコスト・時間が膨らむのを防ぐため。ユーザーから明示的に「全部処理して」「もっと処理して」と言われた場合はその指示に従ってよい。
- 定期メモ（`researchMode: "recurring"`）は一度処理しても消えたり完了扱いになったりしない。ユーザーが手動で `done`/`archived` に変更するまで `active` のまま残り、頻度が来るたびに（`custom` の場合は `recurringCustomDates` の中の未処理日付が来るたびに）何度でも処理対象に入る。`slug` を毎回同じに保つこと（履歴が分裂しないように）。`custom` は他の頻度と挙動そのもの（`active`のまま残る・`history`に蓄積する・`slug`を固定する）は同じで、次回実行日を決まった周期ではなく明示的な日付リスト（`recurringCustomDates`）で管理する点だけが異なる。
- `obsidianSave: true` のメモは、そのメモ自身が今回の処理対象（`pending`/期限到来）でなくても、Obsidian同期（手順6）の対象にはなる。処理対象かどうかとObsidian同期対象かどうかは独立した判定なので混同しないこと。
- 修正リクエスト（`revisionRequested: true`）は「新しい実行」ではないので、`status`/`history`/`last_processed_at`を変えない。定期メモの頻度判定（手順3の経過時間チェック等）にも一切影響しない — 修正リクエストの処理と、その定期メモ本来のスケジュールは完全に独立している。
- APIが401を返す場合、`PIPELINE_TOKEN` が間違っているか失効している。推測で再試行せず、ユーザーに報告する。
- Routine（定期実行）から呼ばれる場合、会話の文脈は無いことがある。このファイルと `CLAUDE.md` / `docs/deployment.md` だけを頼りに独立して完結できるようにすること。
