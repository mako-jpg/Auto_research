# 動的なサイト(？)の作り方、プロンプト

このメモは本文（ブリーフ）が空欄で、手がかりはX（旧Twitter）の投稿URLひとつだけでした。当初は投稿本文を取得できず、投稿者の活動内容から一般的な「AIで動的サイトを作る方法」を広く調べていましたが、今回のリクエストで「`https://portfolio.kaori-dododo.com/` というサイト自体がどうやって作られているか調べてほしい」という具体的な指定をいただいたので、**このサイト自体の作り方・使われている技術を実際に調査し直しました**。あわせて、一般的な「AIで動的サイトを作る方法」の部分は引き続き背景情報として残しています。

## 元になった素材について

参照URLは `https://x.com/k_kaori_dododo/status/2097629156364460082` で、投稿者は「かおり【doの始祖】」（@k_kaori_dododo）というXアカウントです。WebFetchでこのURLに直接アクセスしたところ「402 Payment Required」、fxtwitter/vxtwitterなどの代替ゲートウェイ経由でも「403 Forbidden」やX本体へのリダイレクトとなり、投稿本文・画像・日時などを一切取得できませんでした（この点は今回も状況は変わりません）。

今回新たに指定された `https://portfolio.kaori-dododo.com/` は、かおりさんご本人のポートフォリオサイトです。「AIを活かして、成果につながるクリエイティブを」をコンセプトに、ChatGPT・Codex（OpenAIのAIコーディング支援ツール）・Grok・Higgsfieldなどを使ってLP（ランディングページ）やWebサイト、ショートドラマ、CM、PR動画などを制作しているクリエイターだと自己紹介されています。今回はこのサイト自体をWebFetch・WebSearch・サイト解析サービス（Netcraft、builtwith）で調べ、「動的サイト」というキーワードとどう関係しているかを掘り下げました。

## わかったこと

### そもそも「静的サイト」と「動的サイト」の違い
静的サイトは、あらかじめ作られたHTMLファイルをそのまま表示するだけのシンプルな仕組みで、表示速度が速くセキュリティ面でも比較的安全とされています。一方、動的サイトはアクセスごとにサーバー側でページを組み立てる仕組みで、会員ログイン、データベースとの連携、フォーム送信内容の保存、検索機能など「ユーザーごとに内容が変わる」機能を持たせられるのが特徴です（出典: [Xserverビジネス](https://www.xserver.ne.jp/bizhp/differences-between-static-and-dynamic-sites/)、[Harmonic Society](https://harmonic-society.co.jp/static-vs-dynamic-website-differences/)）。この区別を頭に入れておくと、次のセクションの調査結果が理解しやすくなります。

### portfolio.kaori-dododo.com 自体はどうやって作られているか
まず結論から言うと、このサイトは **Vercel（ネクストジェイエス／Reactの開発元としても知られるホスティング会社）でホスティングされているカスタムコードのサイト**である可能性が高く、STUDIO・Wix・Webflow・Framer・Squarespaceのような「ドラッグ＆ドロップのノーコードサイトビルダー」で作られた形跡は見当たりませんでした。

サイト解析サービスのNetcraftでドメインを調べたところ、ホスティング会社は「Vercel, Inc」、ネームサーバーは `ns1.vercel-dns.com`、IPアドレスもVercel専用のネットブロック（VERCEL-08）に属していることが確認できました（出典: [Netcraft Site Report](https://sitereport.netcraft.com/?url=https://portfolio.kaori-dododo.com/)、2026年9月10日アクセス）。Vercelは元々Next.js（Reactベースのフレームワーク）の開発元で、コードを書いて（またはAIにコードを書かせて）デプロイする用途で使われるプラットフォームです。STUDIOやWix、Webflowのようなノーコードビルダーは基本的に自社専用のCDN・ドメイン体系でホスティングするため、それらのサービス特有のURLパターンやスクリプトの読み込みは見当たりませんでした。もう一つのサイト解析サービスbuiltwith.comでも試しましたが、こちらはページが「Loading…」のまま技術情報を返さず、確定的な判定はできませんでした。

サイトの `sitemap.xml` を直接確認すると、登録されているURLはトップページ（`https://portfolio.kaori-dododo.com/`）ただ1件のみでした（出典: サイト内 `sitemap.xml`、2026年9月10日アクセス）。つまりこのサイトは「作品ページ」「自己紹介ページ」などが別々のURLに分かれた複数ページ構成ではなく、1枚のページの中にセクションを並べた**シングルページ構成**だとわかります。ページ内で見える「作品カルーセル（01→11と番号送りできる表示）」や、なめらかなスクロール・ホバーアニメーションといった「動きのある」要素は、いずれもこの1ページの中でJavaScriptによって表現されているクライアントサイドの演出であり、アクセスのたびにサーバー側がデータベースから内容を組み立て直すような、教科書的な意味での「動的サイト」の仕組みとは別物です。問い合わせ導線もLINE公式アカウントへの外部リンク（`lin.ee/NmqHPrj`）で完結しており、サイト内にフォーム送信を受け取ってデータベースに保存するような機能は見当たりませんでした。

以上を総合すると、このポートフォリオサイト自体は「派手に動いて見えるけれど、実体はほぼ静的な1ページ」で、かおりさん自身が公言している制作フロー（ChatGPTで構成・コピーを練り、Codexのようなコーディング支援AIでコード化し、Vercelにデプロイする）通りに、**AIコーディング支援ツールで書かれた静的〜半静的なコードをVercel上に公開したもの**である可能性が高いと考えられます。ただし、HTMLの`<head>`内の生成ツール表示（generatorメタタグ）やJavaScriptファイルの中身までは今回のツールでは直接読み取れなかったため、「Next.jsなのか、素のHTML/CSS/JSなのか」といった具体的なフレームワーク名までは確定できていません。これはあくまでホスティング環境とサイト構造からの推測である点はご了承ください。

### 彼女の作品例に見る「本当の動的サイト」
ポートフォリオページからリンクされている実際の制作例をいくつか調べたところ、**本当に動的な仕組みを持つツールも見つかりました**。特に目を引くのが「診断型LPファクトリー」（[dododolpfactory.com](https://dododolpfactory.com/)）です。これはユーザーが自分の発信テーマを入力すると、AIが診断クイズの質問・診断ロジック・結果タイプ・特典設計・デザインまでを自動生成し、生成後は専用URLを発行してホスティングまで代行してくれるサービスで、「サーバーもドメインもいりません」と謳われています（出典: [dododolpfactory.com](https://dododolpfactory.com/)、2026年9月10日アクセス）。これは訪問者の回答によって表示される結果が変わる、まさに教科書的な意味での「動的サイト」の一例です。

一方、同じくポートフォリオに掲載されている架空の美容液ブランドのコンセプトサイト「do serum」（[do-serum-atelier.pages.dev](https://do-serum-atelier.pages.dev/)）を確認したところ、こちらは診断・フォーム・カート・会員登録といった動的機能を一切持たない、スクロール演出と映像再生中心の静的なコンセプトサイトでした（サイト最下部に「架空のブランドのため商品は販売していない」旨の注記あり）。同様に架空の採用サイト「do! STUDIO」（[do-studio-recruit.pages.dev](https://do-studio-recruit.pages.dev/)）も確認しましたが、こちらは実在のノーコードツール「STUDIO」とは無関係で、単に劇中の会社名として「STUDIO」を名乗っているだけでした（誤解しやすい点なので念のため明記します）。これらの作品例はCloudflare Pages（`.pages.dev`ドメイン）でホスティングされており、ポートフォリオ本体のVercelホスティングと合わせて、「AIコーディング支援で書いたコードを、Vercel／Cloudflare Pagesのような無料〜低コストの静的・エッジホスティングに載せる」という制作パターンが一貫して見られます。

### AIで動的サイトを作る現在の主な選択肢（2026年9月時点、一般的な背景情報）
上記のように、かおりさんのポートフォリオ自体は比較的シンプルな構成でしたが、より本格的な「動的サイト」（会員機能やデータベース連携があるもの）をAIで作りたい場合の主要ツールは、2026年時点で次のようなものが実用段階にあります。

- **Claude Code**（Anthropic）: ターミナル上で動くAIコーディングエージェント。複数ファイルにまたがる大規模な変更や、データベース連携・API実装など本格的な動的機能も指示次第で作れる。料金はProプラン月20ドル（年払いなら年200ドル）から、より重い使い方向けにMaxプラン（月100〜200ドル）がある（出典: [Uravation](https://uravation.com/media/claude-code-pricing-complete-2026/)、2026年9月）。
- **Codex**（OpenAI）: かおりさんも実際に使っていると公言しているAIコーディング支援ツール。ChatGPTでの構成案作りと地続きで、同じOpenAIのエコシステム内でコード化まで進められるのが特徴です。
- **Lovable**: プログラミング未経験者でもチャット形式でフルスタックのアプリ（データベース連携込み）を作れることを売りにしたツール。クレジット消費制で、無料プランは1日5クレジット（月最大30）、個人向けProプランは月25ドルが目安（出典: [各種比較記事](https://ai-tools-navi.jp/tools/lovable)、2026年）。
- **Bolt.new**（StackBlitz）: ブラウザだけで動くAIアプリ開発ツール。無料プランがあり、使った分だけ課金されるトークン制（出典: [AIPicks](https://aipicks.jp/mag/bolt-new-complete-guide-2026)、2026年）。
- **v0**（Vercel）: デザイン性の高いフロントエンドUI作りに強く、標準的なReactコードとして書き出せるため他ツールへの移行がしやすい。無料プランと月30ドル〜のPlusプランがある（出典: 各種比較記事、2026年）。

大まかな使い分けとしては、コードを書ける人がガッツリ作り込みたいならClaude CodeやCodex、非エンジニアがとにかく早くフルスタックのMVP（最小限の動くもの）を作りたいならLovable、デザイン重視のUIだけ欲しいならv0、といった住み分けが各比較記事で共通して語られています（出典: [Lovable公式ガイド](https://lovable.dev/guides/best-vibe-coding-tools-2026-build-apps-chatting)、2026年）。

### 良い結果を得るためのプロンプトのコツ
複数の解説記事に共通していたポイントをまとめると、まず最初から完璧な指示を書こうとせず、ざっくりした指示を出してAIの返答を見ながら対話的に深掘りしていく方が、結果的に早くて満足度の高い成果物にたどり着きやすいとされています（出典: [OptiMax AI](https://www.optimax.co.jp/ai-information/prompt-writing-guide/)、2026年）。コーディング用途では、日本語での指示自体は問題なく通じますが、コードの細かい仕様（変数名、使用したい技術スタックなど）は英語で指定した方が精度が上がりやすいという実務者の声もあります（出典: [sugoyoku.com](https://sugoyoku.com/blog/prompt-30-2026/)、2026年）。実際、同じ文脈のノウハウとして、リベシティというコミュニティの別ユーザーが書いた記事「[ChatGPTで作ったLPをClaude Codeで本物のHP化＋Cloudflare無料公開](https://library.libecity.com/articles/01KQDJSQHAJ6E3JKKJE9PXN07X)」（2026年）では、「このフォルダのLP案を元に、本格的なホームページを作ってCloudflareでデプロイしてください」という簡潔な丸投げプロンプトだけで、ChatGPTの構成案→Claude Codeによるコーディング→Cloudflare Pagesでの無料公開、という一連の流れが約30分・無料でできると紹介されています。これは今回確認した、かおりさんの作品例の多くがCloudflare Pagesでホスティングされている点とも符合します。

### 実際に試す場合の注意点・限界
生成AIでサイトを作る際は、著作権とセキュリティの2点に特に注意が必要だと各解説サイトが指摘しています。AIが生成したコードや文章、画像が既存の著作物に酷似してしまう可能性があるため、商用利用前には利用規約や生成物の独自性を確認すること。また機密情報や個人情報を無料の公開AIサービスに入力しないこと（入力内容が学習データに使われる場合がある）が基本的な注意点です（出典: [AeyeScan](https://www.aeyescan.jp/blog/gen-ai-copyright/)、[ALSOK](https://www.digitalsales.alsok.co.jp/col_generative_ai)、2026年）。

本当に会員機能やデータベース連携を持つ動的サイト（今回の例で言えば「診断型LPファクトリー」のようなもの）は、静的サイトに比べてサーバー費用や保守（セキュリティアップデートなど）の手間が発生しやすい点も一般的な注意点として挙げられます（出典: [リヒトス](https://lichtos.co.jp/static-site/static-dynamic-site/)）。AIが生成した回答をそのまま鵜呑みにしてしまう「ハルシネーション」（もっともらしい誤情報）のリスクもあり、特にデータベース設計やユーザー認証周りなど間違えるとセキュリティ事故に直結する部分は、AI任せにせず人間側で最終チェックする必要があるとされています。

## 背景・関連情報

かおりさんのような「AIでLP・サイトを作るノウハウを発信・販売するクリエイター」は2026年に入って増えており、その多くが「ChatGPTなどの対話型AIでまず構成・コピー・デザイン案を練り、Claude CodeやCodexのようなAIコーディングツールで実際のコードに落とし込み、VercelやCloudflare Pagesなど無料〜低コストのホスティングで公開する」という2段階〜3段階のワークフローを推奨しています。今回調べた portfolio.kaori-dododo.com 自体も、まさにこのワークフローの実例だと考えられます。これは、デザイナーやエンジニアを雇わずに個人・小規模事業者がサイトを持てるようにする「ノーコード／AIコーディングの民主化」という2026年の大きなトレンドの一部です（出典: [sungrove.co.jp](https://www.sungrove.co.jp/lp-ai-sakusei/)、2026年）。

一方で、こうした「バイブコーディング」（コードを厳密に理解せず、AIとの対話だけでアプリを作るスタイル）には賛否があります。開発スピードが劇的に上がるというポジティブな評価がある一方、生成されたコードの品質・セキュリティ・保守性を誰がどう担保するのかという懸念も、AI開発者コミュニティのブログ等でしばしば議論されています。今回のように「見た目は動いて見えるが実体はシンプルな静的ページ」と「本当にユーザーごとに内容が変わる動的な仕組み」を混同しないことは、この種のノウハウ発信を参考にする際に意識しておく価値があるポイントです。

## 気になるポイント・意見が分かれているところ

- 今回、`portfolio.kaori-dododo.com` については「Vercelでホスティングされている」「シングルページ構成である」「ノーコードビルダー特有の痕跡が見当たらない」というところまでは確認できましたが、HTMLの生成ツール表示（generatorメタタグ）やJavaScriptファイルの中身までは今回使えるツールでは直接読み取れず、具体的なフレームワーク名（Next.jsなのか、素のHTML/CSS/JSなのかなど）までは確定できていません。ホスティング環境と本人の公言する制作フロー（ChatGPT＋Codex）から「AIコーディング支援で書かれたカスタムコードである可能性が高い」と推測している段階である点はご了承ください。
- 依然として、大元の参照であるX投稿そのものの本文は確認できていません。X（Twitter）は現在、ログインしていない第三者ツールからの本文取得を強く制限しており、WebFetch・fxtwitter/vxtwitter経由の取得のいずれも失敗しました。そのため「動的なサイト」というタイトルの言葉が投稿者本人としてはどんな意味・文脈で使われていたのかは、今回のサイト調査で得られた推測（＝おそらく「見た目が動く」という意味合いも含んでいる可能性がある）で補っている点にご留意ください。

## 出典一覧

1. [かおり【doの始祖】 (@k_kaori_dododo) on X](https://x.com/k_kaori_dododo) — アクセス日 2026年9月9日（本文取得は失敗）
2. [do Kaori — つくるたび、世界がひらく。（ポートフォリオサイト）](https://portfolio.kaori-dododo.com/) — 2026年9月10日アクセス
3. [Netcraft Site Report: portfolio.kaori-dododo.com](https://sitereport.netcraft.com/?url=https://portfolio.kaori-dododo.com/) — 2026年9月10日アクセス
4. portfolio.kaori-dododo.com の `sitemap.xml` / `robots.txt` — 2026年9月10日アクセス
5. [診断型LPファクトリー（dododolpfactory.com）](https://dododolpfactory.com/) — 2026年9月10日アクセス
6. [do serum（do-serum-atelier.pages.dev、架空ブランドのコンセプトサイト）](https://do-serum-atelier.pages.dev/) — 2026年9月10日アクセス
7. [do! STUDIO 採用サイト（do-studio-recruit.pages.dev、架空企業の採用デモサイト）](https://do-studio-recruit.pages.dev/) — 2026年9月10日アクセス
8. [ChatGPTで作ったLPをClaude Codeで本物のHP化＋Cloudflare無料公開](https://library.libecity.com/articles/01KQDJSQHAJ6E3JKKJE9PXN07X) — 2026年
9. [dododoの裏部屋（note）](https://note.com/uradododo_ai/all) — 2026年
10. [静的サイトと動的サイトの違い！メリットとデメリットを解説（Xserverビジネス）](https://www.xserver.ne.jp/bizhp/differences-between-static-and-dynamic-sites/) — 発行日不明（2026年時点で閲覧）
11. [静的サイトと動的サイトの違いとは？（Harmonic Society）](https://harmonic-society.co.jp/static-vs-dynamic-website-differences/) — 2026年
12. [「静的サイト」と「動的サイト」の違いと選び方（リヒトス）](https://lichtos.co.jp/static-site/static-dynamic-site/) — 発行日不明
13. [Best Vibe Coding Tools in 2026: Build Apps by Chatting（Lovable公式ガイド）](https://lovable.dev/guides/best-vibe-coding-tools-2026-build-apps-chatting) — 2026年
14. [Lovableの評判・料金・使い方【2026年】（AIツールナビ）](https://ai-tools-navi.jp/tools/lovable) — 2026年
15. [【2026年最新】Bolt.newの使い方・料金を完全解説（AIPicks）](https://aipicks.jp/mag/bolt-new-complete-guide-2026) — 2026年
16. [Claude Code料金｜全プラン日本円比較（Uravation）](https://uravation.com/media/claude-code-pricing-complete-2026/) — 2026年9月
17. [【2026年版】プロンプトの書き方完全ガイド（OptiMax AI）](https://www.optimax.co.jp/ai-information/prompt-writing-guide/) — 2026年
18. [2026年最新 ChatGPTプロンプト集｜Webデザイン・コーディング30選（sugoyoku.com）](https://sugoyoku.com/blog/prompt-30-2026/) — 2026年
19. [生成AIの著作権侵害｜訴訟リスクを回避する3つの必須対策（AeyeScan）](https://www.aeyescan.jp/blog/gen-ai-copyright/) — 発行日不明
20. [生成AIのリスクと情報セキュリティ対策（ALSOK）](https://www.digitalsales.alsok.co.jp/col_generative_ai) — 発行日不明
21. [LP制作をAIで効率化するには？（sungrove.co.jp）](https://www.sungrove.co.jp/lp-ai-sakusei/) — 2026年
