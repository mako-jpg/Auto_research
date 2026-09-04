# memo-app デプロイ情報

このファイルには **秘密の値は書かない**（実際のパスワード・トークンはVercelの環境変数にのみ保存する）。

## デプロイ先

- Vercelプロジェクト: （デプロイ後に追記）
- 本番URL: （デプロイ後に追記）

## 必要な環境変数（Vercel Project Settings → Environment Variables）

| 変数名 | 用途 | 値の確認・再発行方法 |
|---|---|---|
| `ADMIN_EMAIL` | 人間のログイン用メールアドレス | Vercelダッシュボードで設定 |
| `ADMIN_PASSWORD` | 人間のログイン用パスワード | Vercelダッシュボードで設定 |
| `SESSION_SECRET` | ログインセッションCookieの署名鍵 | ランダムな長い文字列。ダッシュボードで設定 |
| `PIPELINE_TOKEN` | Routine（自動パイプライン）専用のAPIアクセストークン | ランダムな長い文字列。ダッシュボードで設定 |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blobストアの読み書き | Blobストアをプロジェクトにアタッチすると自動設定される |

## セットアップ手順

1. Vercelダッシュボードでこのプロジェクトの **Storage → Create Database → Blob** からBlobストアを作成し、このプロジェクトにアタッチする（`BLOB_READ_WRITE_TOKEN` が自動で環境変数に追加される）。
2. Project Settings → Environment Variables で上記の残り4つを設定する。
3. 再デプロイする（環境変数は次回デプロイから反映される）。
4. Routineの設定（`PIPELINE_TOKEN` と本番URL）を最新化する。Claude Codeに「Routineのプロンプトを更新して」と頼めばよい。

## Routineが使う認証

Routine（6時間おきの自動パイプライン）は `Authorization: Bearer <PIPELINE_TOKEN>` ヘッダでAPIにアクセスする。人間のログイン（`ADMIN_EMAIL`/`ADMIN_PASSWORD`）とは完全に別の資格情報。
