# Auto_research

リサーチしたいトピックをメモしておくと、Claude Code がサブエージェントを使って
「リサーチ → Note記事の下書き → ショート動画の構成案」まで自動生成してくれる仕組みです。

詳しい構成は [`CLAUDE.md`](./CLAUDE.md)、デプロイ情報は [`docs/deployment.md`](./docs/deployment.md) を参照してください。

## クイックスタート

### 1. デプロイ済みのメモアプリを開く

`docs/deployment.md` に記載の本番URLを開き、メールアドレス・パスワードでログインして、
リサーチしてほしいトピックをメモとして追加します（`memo-app/` はVercelにデプロイして使う前提のアプリです）。

メモは「単発」（1回だけリサーチ）か「定期的」（毎日/毎週/毎月、繰り返しリサーチ）を選べます。
定期メモは処理後もアーカイブされず、メモ一覧に残り続けて次回の頻度が来るたびに再処理されます。

### 2. パイプラインを実行

Claude Code で `/research-pipeline` を実行すると、メモアプリのAPIから `pending` 状態のメモと、
期限が来た定期メモ（最大3件）を取得し、リサーチ → 記事下書き → ショート動画構成の順に処理して、
`output/<slug>/`（定期メモは `output/<slug>/<date>/`）に保存し、メモのステータス・履歴を更新します。
6時間おきのRoutineが自動実行する設定になっています。

### 3. 成果物を確認

- `output/<slug>/research.md` — リサーチブリーフ（出典付き）
- `output/<slug>/article.md` — Note記事の下書き
- `output/<slug>/video-structure.md` — ショート動画の構成・台本

いずれも **下書き** です。公開前に必ず内容を確認してください。生成後はこのリポジトリにコミットされます。
定期メモの場合、Web UIのリサーチページで過去の実行を日付ごとに切り替えて見られます。

## メモアプリをローカルで動かす場合

```bash
cd memo-app
npm install
npx vercel link      # 初回のみ: このVercelプロジェクトと紐付け
npx vercel env pull  # 環境変数をローカルに取得
npx vercel dev
```
