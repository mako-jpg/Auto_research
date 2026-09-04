# Auto_research

個人のリサーチ → Note記事下書き → ショート動画構成、を自動化するプロジェクト。

## 全体像

1. **`memo-app/`** — ローカルで動かす簡易メモアプリ（Flask + 素のHTML/JS）。「リサーチしてほしいトピック」を記録する。データは `memo-app/data/memos.json` にファイルとして保存され、このリポジトリでバージョン管理される（外部DB・外部サービス不要）。
2. **`.claude/agents/`** — パイプラインで使うサブエージェント定義。
   - `researcher` — Web検索でトピックを調査し、出典付きのリサーチブリーフを作る
   - `article-writer` — リサーチブリーフからNote記事の下書きを書く
   - `video-composer` — 記事からショート動画（Shorts/TikTok/Reels想定）の構成・台本を作る
3. **`.claude/skills/research-pipeline/SKILL.md`** — 上記メモを読み、3つのサブエージェントを順番に呼び出して `output/` 配下に成果物を作るオーケストレーションスキル。手動なら `/research-pipeline` として呼び出せる。
4. **`output/<slug>/`** — 生成された `research.md` / `article.md` / `video-structure.md`。すべて **下書き**。自動公開はしない。

## メモのスキーマ（`memo-app/data/memos.json`）

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

`status` は `pending` → `researching` → `drafted` → `done`（または `archived`）と遷移する。パイプラインは `pending` のものだけを処理し、完了したら `drafted` にして `outputs` にファイルパスを記録する。

## 定期実行（Routine）

Claude Code の Routine（スケジュールトリガー）でこのリポジトリを起点に `/research-pipeline`（= `research-pipeline` スキルの内容）を定期実行し、新しく追加されたメモを処理する想定。実際の Routine 作成・頻度はユーザーとの合意の上でセットアップする（無制限に自動実行しない）。

## メモを追加する方法（ローカル）

```
cd memo-app
pip install -r requirements.txt
python app.py
```

ブラウザで `http://localhost:5050` を開き、フォームからメモを追加する。追加すると `memo-app/data/memos.json` が更新されるので、コミット・push すれば Routine が拾えるようになる。

## 開発方針

- 記事・動画構成の自動公開は **行わない**。必ず人間のレビューを挟む。
- パイプラインの1回の実行につき処理するメモは最大3件（暴走・コスト膨張防止）。
- サブエージェントは事実の捏造を避け、根拠が薄い場合はその旨を明記する。
