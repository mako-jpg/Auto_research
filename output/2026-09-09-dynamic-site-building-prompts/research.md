# 動的なサイト(？)の作り方、プロンプト

このメモは本文（ブリーフ）が空欄で、手がかりはX（旧Twitter）の投稿URLひとつだけでした。結論から言うと、今回はその投稿の本文そのものを取得することができませんでした。そこで、投稿者のアカウントから読み取れる活動内容と、タイトルにある「動的なサイトの作り方」「プロンプト」というキーワードを手がかりに、2026年9月時点でAIを使って動的なサイト（データベースや会員機能などを持つ、ただ表示するだけではないサイト）を作るための主要な方法・ツール・プロンプトのコツを広く調査しました。投稿の実物と照らし合わせたい場合は、後述の限界を踏まえてご自身でも一度リンク先を確認していただくのが確実です。

## 元になった素材について

参照URLは `https://x.com/k_kaori_dododo/status/2097629156364460082` で、投稿者は「かおり【doの始祖】」（@k_kaori_dododo）というXアカウントです。WebFetchでこのURLに直接アクセスしたところ「402 Payment Required」、fxtwitter/vxtwitterなどの代替ゲートウェイ経由でも「403 Forbidden」やX本体へのリダイレクトとなり、投稿本文・画像・日時などを一切取得できませんでした。Nitter（Twitterの非公式ビューア）も、運営元が2026年8月にX社から差し止め通知を受けてサービスが不安定になっており、目的の投稿にはたどり着けませんでした。Google検索でもこの投稿ID自体や本文らしき文言はヒットしませんでした。

そのため、代わりにこのアカウント本人のプロフィールや関連ページを調べました。プロフィールサイト（[portfolio.kaori-dododo.com](https://portfolio.kaori-dododo.com/)）によると、かおりさんは「AIを活かして、成果につながるクリエイティブを」をコンセプトに、ChatGPT・Codex（AIコーディング支援）・Grok・Higgsfieldなどを使ってLP（ランディングページ）やWebサイト、ショートドラマ、CM、PR動画などを制作しているクリエイターです。noteでは「dododoの裏部屋」というアカウントでAI活用のプロンプトやノウハウを有料販売しており、Threadsの投稿（[出典](https://www.threads.com/@k_kaori.dododo/post/DXGhZTWkvEa/)）では「AIでポン出しだせるようにアプリ作りました」といった、AIで実用的なツール・サイトを作る発信もしています。

こうした活動内容と、メモタイトルの「動的なサイト(？)」「プロンプト」という言葉を合わせて考えると、この投稿はおそらく「ChatGPTなどで作ったLPの下書きを、AIコーディングツール（Claude Codeなど）で実際に動く本物のサイトにする」といった、彼女がふだん発信しているワークフロー・プロンプトの紹介だったと推測されます。実際、同じ文脈のノウハウとして、リベシティというコミュニティの別ユーザーが書いた記事「[ChatGPTで作ったLPをClaude Codeで本物のHP化＋Cloudflare無料公開](https://library.libecity.com/articles/01KQDJSQHAJ6E3JKKJE9PXN07X)」（2026年）では、「このフォルダのLP案を元に、本格的なホームページを作ってCloudflareでデプロイしてください」という簡潔な丸投げプロンプトだけで、ChatGPTの構成案→Claude Codeによるコーディング→Cloudflare Pagesでの無料公開、という一連の流れが約30分・無料でできると紹介されています。ただし、これはかおりさん本人の投稿ではなく、あくまで同じ潮流にある別の情報源であることは明記しておきます。**投稿本体の内容を確認できていない以上、この推測が外れている可能性がある点はご了承ください。**

## わかったこと

### そもそも「静的サイト」と「動的サイト」の違い
静的サイトは、あらかじめ作られたHTMLファイルをそのまま表示するだけのシンプルな仕組みで、表示速度が速くセキュリティ面でも比較的安全とされています。一方、動的サイトはアクセスごとにサーバー側でページを組み立てる仕組みで、会員ログイン、データベースとの連携、フォーム送信内容の保存、検索機能など「ユーザーごとに内容が変わる」機能を持たせられるのが特徴です（出典: [Xserverビジネス](https://www.xserver.ne.jp/bizhp/differences-between-static-and-dynamic-sites/)、[Harmonic Society](https://harmonic-society.co.jp/static-vs-dynamic-website-differences/)）。AIで「サイトを作る」というとき、多くの入門者向け情報は見た目だけのLP＝静的サイトの話をしていることが多いのですが、会員機能や予約システムなどを求める場合は動的サイトの知識・ツールが必要になります。

### AIで動的サイトを作る現在の主な選択肢（2026年9月時点）
2026年時点で、プロンプト（自然言語の指示）だけでアプリやサイトを作る「バイブコーディング」系のツールがいくつも実用段階に入っています。代表的なものを比較すると次の通りです。

- **Claude Code**（Anthropic）: ターミナル上で動くAIコーディングエージェントで、複数ファイルにまたがる大規模な変更や、既存コードの文脈を踏まえた修正が得意。データベース連携やAPI実装など本格的な動的機能も指示次第で作れる。料金はProプラン月20ドル（年払いなら年200ドル）から、より重い使い方向けにMaxプラン（月100〜200ドル）がある（出典: [Uravation](https://uravation.com/media/claude-code-pricing-complete-2026/)、2026年9月）。
- **Lovable**: プログラミング未経験者でもチャット形式でフルスタックのアプリ（データベース連携込み）を作れることを売りにしたツール。クレジット消費制で、無料プランは1日5クレジット（月最大30）、個人向けProプランは月25ドルが目安（出典: [各種比較記事](https://ai-tools-navi.jp/tools/lovable)、2026年）。
- **Bolt.new**（StackBlitz）: ブラウザだけで動くAIアプリ開発ツール。無料プランがあり、使った分だけ課金されるトークン制。フレームワークをいろいろ試したい人向け（出典: [AIPicks](https://aipicks.jp/mag/bolt-new-complete-guide-2026)、2026年）。
- **v0**（Vercel）: デザイン性の高いフロントエンドUI作りに強く、標準的なReactコードとして書き出せるため他ツールへの移行がしやすい。無料プランと月30ドル〜のPlusプランがある（出典: 各種比較記事、2026年）。
- **Replit Agent**: ブラウザ上でコーディングからデプロイまで完結させたい人向け。Coreプランは年払いで月20ドル・月払いで月25ドル、複数人でリアルタイム共同編集ができるのが強み（出典: [AIPicks](https://aipicks.jp/mag/replit-agent-guide-2026)、2026年）。

大まかな使い分けとしては、コードを書ける人がガッツリ作り込みたいならClaude CodeやCursor、非エンジニアがとにかく早くフルスタックのMVP（最小限の動くもの）を作りたいならLovable、デザイン重視のUIだけ欲しいならv0、といった住み分けが各比較記事で共通して語られています（出典: [Lovable公式ガイド](https://lovable.dev/guides/best-vibe-coding-tools-2026-build-apps-chatting)、2026年）。

### 良い結果を得るためのプロンプトのコツ
複数の解説記事に共通していたポイントをまとめると、まず最初から完璧な指示を書こうとせず、ざっくりした指示を出してAIの返答を見ながら対話的に深掘りしていく方が、結果的に早くて満足度の高い成果物にたどり着きやすいとされています（出典: [OptiMax AI](https://www.optimax.co.jp/ai-information/prompt-writing-guide/)、2026年）。また「あなたは〇〇の専門家です」のように役割を先に与えると回答の一貫性が上がるとも言われます。

コーディング用途では、日本語での指示自体は問題なく通じますが、コードの細かい仕様（変数名、使用したい技術スタックなど）は英語で指定した方が精度が上がりやすいという実務者の声もあります（出典: [sugoyoku.com](https://sugoyoku.com/blog/prompt-30-2026/)、2026年）。前述のLP制作の例のように、「このフォルダの案を元に、本格的なサイトを作ってデプロイしてください」といった、目的とゴール（何を・どう公開するか）を明確に伝える一文のプロンプトでも、AIコーディングエージェントは十分に動いてくれるケースが増えています。

### 実際に試す場合の注意点・限界
生成AIでサイトを作る際は、著作権とセキュリティの2点に特に注意が必要だと各解説サイトが指摘しています。AIが生成したコードや文章、画像が既存の著作物に酷似してしまう可能性があるため、商用利用前には利用規約や生成物の独自性を確認すること。また機密情報や個人情報を無料の公開AIサービスに入力しないこと（入力内容が学習データに使われる場合がある）が基本的な注意点です（出典: [AeyeScan](https://www.aeyescan.jp/blog/gen-ai-copyright/)、[ALSOK](https://www.digitalsales.alsok.co.jp/col_generative_ai)、2026年）。

動的サイトは静的サイトに比べて、サーバー費用や保守（セキュリティアップデートなど）の手間が発生しやすい点も一般的な注意点として挙げられます（出典: [リヒトス](https://lichtos.co.jp/static-site/static-dynamic-site/)）。さらにAIが生成した回答をそのまま鵜呑みにしてしまう「ハルシネーション」（もっともらしい誤情報）のリスクもあり、特にデータベース設計やユーザー認証周りなど間違えるとセキュリティ事故に直結する部分は、AI任せにせず人間側で最終チェックする必要があるとされています。

## 背景・関連情報

かおりさんのような「AIでLP・サイトを作るノウハウを発信・販売するクリエイター」は2026年に入って増えており、その多くが「ChatGPTなどの対話型AIでまず構成・コピー・デザイン案を練り、Claude CodeやCursorのようなAIコーディングツールで実際のコードに落とし込み、Cloudflare PagesやVercelなど無料〜低コストのホスティングで公開する」という2段階〜3段階のワークフローを推奨しています。これは、デザイナーやエンジニアを雇わずに個人・小規模事業者がサイトを持てるようにする「ノーコード／AIコーディングの民主化」という2026年の大きなトレンドの一部です（出典: [sungrove.co.jp](https://www.sungrove.co.jp/lp-ai-sakusei/)、2026年）。

一方で、こうした「バイブコーディング」（コードを厳密に理解せず、AIとの対話だけでアプリを作るスタイル）には賛否があります。開発スピードが劇的に上がるというポジティブな評価がある一方、生成されたコードの品質・セキュリティ・保守性を誰がどう担保するのかという懸念も、AI開発者コミュニティのブログ等でしばしば議論されています。特に「動的サイト」＝データベースやユーザー情報を扱うサイトは、静的なLPに比べて事故が起きた際の影響が大きいため、この点は今回のようなプロンプト紹介系の投稿を参考にする際にも意識しておく価値があります。

## 気になるポイント・意見が分かれているところ

- 最大の限界は、今回参照元として渡されたX投稿そのものの本文を確認できなかったことです。X（Twitter）は現在、ログインしていない第三者ツールからの本文取得を強く制限しており、WebFetch・fxtwitter/vxtwitter経由の取得・Nitter経由の取得のいずれも失敗しました。そのため「動的なサイト」が具体的にどんなツール・どんなプロンプトを指しているのか、投稿者本人の言葉としては特定できていません。上記の「わかったこと」は、あくまで投稿者の普段の活動内容とタイトルの文言から推測した、一般的な周辺情報であるとご理解ください。
- もし可能であれば、ブラウザにログインした状態でご自身で投稿を開いて確認いただくか、投稿のスクリーンショットを撮って再度リサーチ依頼をいただければ、より投稿内容に即した精度の高い調査ができます。

## 出典一覧

1. [かおり【doの始祖】 (@k_kaori_dododo) on X](https://x.com/k_kaori_dododo) — アクセス日 2026年9月9日（本文取得は失敗）
2. [do Kaori — つくるたび、世界がひらく。（ポートフォリオサイト）](https://portfolio.kaori-dododo.com/) — 2026年
3. [ChatGPTで作ったLPをClaude Codeで本物のHP化＋Cloudflare無料公開](https://library.libecity.com/articles/01KQDJSQHAJ6E3JKKJE9PXN07X) — 2026年
4. [dododoの裏部屋（note）](https://note.com/uradododo_ai/all) — 2026年
5. [静的サイトと動的サイトの違い！メリットとデメリットを解説（Xserverビジネス）](https://www.xserver.ne.jp/bizhp/differences-between-static-and-dynamic-sites/) — 発行日不明（2026年時点で閲覧）
6. [静的サイトと動的サイトの違いとは？（Harmonic Society）](https://harmonic-society.co.jp/static-vs-dynamic-website-differences/) — 2026年
7. [「静的サイト」と「動的サイト」の違いと選び方（リヒトス）](https://lichtos.co.jp/static-site/static-dynamic-site/) — 発行日不明
8. [Best Vibe Coding Tools in 2026: Build Apps by Chatting（Lovable公式ガイド）](https://lovable.dev/guides/best-vibe-coding-tools-2026-build-apps-chatting) — 2026年
9. [Lovableの評判・料金・使い方【2026年】（AIツールナビ）](https://ai-tools-navi.jp/tools/lovable) — 2026年
10. [【2026年最新】Bolt.newの使い方・料金を完全解説（AIPicks）](https://aipicks.jp/mag/bolt-new-complete-guide-2026) — 2026年
11. [Replit Agentの使い方・料金まとめ（AIPicks）](https://aipicks.jp/mag/replit-agent-guide-2026) — 2026年
12. [Claude Code料金｜全プラン日本円比較（Uravation）](https://uravation.com/media/claude-code-pricing-complete-2026/) — 2026年9月
13. [【2026年最新】AIコーディングツール7選を実務で使い倒した本音比較（withcode.tech）](https://withcode.tech/media/ai-coding-tools-comparison-2026/) — 2026年7月時点
14. [【2026年版】プロンプトの書き方完全ガイド（OptiMax AI）](https://www.optimax.co.jp/ai-information/prompt-writing-guide/) — 2026年
15. [2026年最新 ChatGPTプロンプト集｜Webデザイン・コーディング30選（sugoyoku.com）](https://sugoyoku.com/blog/prompt-30-2026/) — 2026年
16. [生成AIの著作権侵害｜訴訟リスクを回避する3つの必須対策（AeyeScan）](https://www.aeyescan.jp/blog/gen-ai-copyright/) — 発行日不明
17. [生成AIのリスクと情報セキュリティ対策（ALSOK）](https://www.digitalsales.alsok.co.jp/col_generative_ai) — 発行日不明
18. [LP制作をAIで効率化するには？（sungrove.co.jp）](https://www.sungrove.co.jp/lp-ai-sakusei/) — 2026年
