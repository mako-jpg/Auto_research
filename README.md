# Auto_research

リサーチしたいトピックをメモしておくと、Claude Code がサブエージェントを使って
「リサーチ → Note記事の下書き → ショート動画の構成案」まで自動生成してくれる仕組みです。

詳しい構成は [`CLAUDE.md`](./CLAUDE.md) を参照してください。

## クイックスタート

### 1. メモアプリを起動

```bash
cd memo-app
pip install -r requirements.txt
python app.py
```

`http://localhost:5050` を開いて、リサーチしてほしいトピックをメモとして追加します。

### 2. メモをコミット・push

```bash
git add memo-app/data/memos.json
git commit -m "Add memo: ..."
git push
```

### 3. パイプラインを実行

Claude Code で `/research-pipeline` を実行すると、`pending` 状態のメモ（最大3件）を
リサーチ → 記事下書き → ショート動画構成の順に処理し、`output/<slug>/` に保存します。
定期的に自動実行したい場合は Routine（スケジュールトリガー）として設定できます。

### 4. 成果物を確認

- `output/<slug>/research.md` — リサーチブリーフ（出典付き）
- `output/<slug>/article.md` — Note記事の下書き
- `output/<slug>/video-structure.md` — ショート動画の構成・台本

いずれも **下書き** です。公開前に必ず内容を確認してください。
メモアプリの一覧画面からも各成果物へのリンクを開けます。
