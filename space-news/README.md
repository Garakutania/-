# 🛰️ 宇宙ビジネス・宇宙開発ニュース 毎朝要約システム

毎朝**9時(JST)**に、**前日00:00から実行時点まで**に発表された宇宙ビジネス・宇宙開発
関連ニュースをWEB上（RSS/Atomフィード）からクローリングして収集し、カテゴリ別に整理した
**要約記事（Markdown & HTML）**を自動生成・提示するシステムです。

## 仕組み

```
GitHub Actions (毎朝9時 JST / cron: 0 0 * * *)
        │
        ▼
space-news/crawler.py
  1. sources.json のフィードを取得
  2. 前日00:00〜現在 の記事だけを抽出（重複除去）
  3. カテゴリ分類（ロケット/衛星/探査/有人/企業・投資/政策 …）
  4. 「今日のまとめ」を生成（Claude API があれば論説、なければ自動要約）
  5. digests/YYYY-MM-DD.md / .html と index.html を出力
        │
        ▼
生成物をリポジトリにコミット（アーカイブとして蓄積）
```

- **依存ライブラリ不要**（Python 3.11 標準ライブラリのみ）。`pip install` は不要です。
- 外部サービスへのAPIキー登録なしでも動作します。

## 出力物

| ファイル | 内容 |
|---|---|
| `space-news/digests/YYYY-MM-DD.md` | 日次要約（Markdown） |
| `space-news/digests/YYYY-MM-DD.html` | 日次要約（スタンドアロンHTML・ダーク対応） |
| `space-news/digests/latest.txt` | 最新分のプレーンテキスト要約（メール通知の本文に使用） |
| `space-news/index.html` | 過去レポートのアーカイブ一覧（GitHub Pagesのトップ） |

## スマホで見る・受け取る

### 📱 GitHub Pages で閲覧
ワークフローは毎回 `space-news/` を **GitHub Pages** に自動デプロイします。初回のみ
リポジトリ **Settings → Pages → Build and deployment → Source** を **「GitHub Actions」**
に設定してください（ワークフローが自動有効化を試みますが、組織設定によっては手動が必要です）。
公開URL（例: `https://<ユーザー名>.github.io/<リポジトリ名>/`）をスマホのブラウザで開き、
ホーム画面に追加するとアプリのように使えます。HTMLはレスポンシブ＆ダークモード対応です。

### 📧 メールで毎朝受け取る
毎朝の実行後、要約をメール送信します。リポジトリの
**Settings → Secrets and variables → Actions** に以下を登録してください（Gmailの例）。

| Secret 名 | 値 | 必須 |
|---|---|---|
| `MAIL_USERNAME` | 送信元Gmailアドレス | ✅ |
| `MAIL_PASSWORD` | Gmailの[アプリパスワード](https://support.google.com/accounts/answer/185833)（通常のログインパスワード不可） | ✅ |
| `MAIL_TO` | 受信先メールアドレス | ✅ |
| `MAIL_SERVER` | SMTPサーバー（未設定なら `smtp.gmail.com`） | 任意 |
| `MAIL_PORT` | SMTPポート（未設定なら `465`） | 任意 |

`MAIL_USERNAME` が未登録の場合、メール送信ステップは自動的にスキップされます
（Pages公開・アーカイブ生成は通常どおり動作します）。Gmail以外のSMTPも
`MAIL_SERVER` / `MAIL_PORT` を設定すれば利用できます。

## セットアップ

1. このリポジトリを GitHub にプッシュすると、`.github/workflows/space-news-daily.yml`
   が毎朝9時(JST)に自動実行されます。
2. GitHub → Actions タブから「宇宙ニュース毎朝要約」を **Run workflow** で手動実行も可能です。
3. （任意）Claude による質の高い論説要約を有効にするには、リポジトリの
   **Settings → Secrets and variables → Actions** に `ANTHROPIC_API_KEY` を登録します。
   未登録の場合は見出しから自動生成した要約が使われます。
4. （任意）`index.html` を公開したい場合は **Settings → Pages** で
   `space-news/` を配信ディレクトリに設定すると、ブラウザで閲覧できます。

## ローカルでの実行

```bash
python space-news/crawler.py                 # 通常実行（前日00:00〜現在）
python space-news/crawler.py --since-hours 30 # 直近30時間を対象にする
python space-news/crawler.py --no-llm        # Claude要約を無効化
```

> 注: 生成対象のフィードは外部サイトへのアクセスが必要です。ネットワーク制限のある
> 環境では取得に失敗するフィードがありますが、その場合も取得できたフィードだけで
> レポートを生成します。

## 情報源の追加・変更

`space-news/sources.json` を編集します。

```json
{ "name": "表示名", "url": "https://example.com/feed", "lang": "ja",
  "google_news": true }
```

- `google_news: true` を付けると、Googleニュース形式のタイトル末尾（`- 媒体名`）を
  自動で分離し、媒体名を情報源として表示します。
- 初期状態では sorae.info、Googleニュース（宇宙ビジネス/宇宙開発/ロケット/JAXA）、
  SpaceNews、NASA、Spaceflight Now、ESA、Ars Technica を登録しています。

## カテゴリ分類

タイトルと本文のキーワードで以下に自動分類します（`crawler.py` の `CATEGORIES` で調整可能）。

- ロケット・打ち上げ
- 衛星・通信
- 探査・科学
- 有人・宇宙ステーション
- 企業・投資
- 政策・防衛・安全保障
- その他
