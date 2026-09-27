# セットアップ手順（スマホで見る・受け取る）

このシステムは **GitHub Actions（クラウド）** で毎朝9時(JST)に自動実行されます。
以下は、スマホで要約を「見る（GitHub Pages）」「受け取る（メール通知）」ための
**初回のみ必要な設定**と、動作確認の手順です。

---

## 📱 1. GitHub Pages で閲覧できるようにする

ワークフローは毎回 `space-news/` を GitHub Pages へ自動デプロイします。初回のみ以下を設定してください。

1. リポジトリの **Settings → Pages** を開く
2. **Build and deployment → Source** を **「GitHub Actions」** に設定
   - ワークフローが自動有効化を試みますが、反映されない場合はこの手動設定が必要です
3. 公開URL（例: `https://garakutania.github.io/-/`）をスマホのブラウザで開く
4. ブラウザメニューから **「ホーム画面に追加」** すると、アプリのように使えます

> HTMLはレスポンシブ＆ダークモード対応です。トップページ（`index.html`）から
> 日付ごとの要約にアクセスできます。

---

## 📧 2. メールで毎朝受け取れるようにする

毎朝の実行後、要約をメール送信します。リポジトリの
**Settings → Secrets and variables → Actions → New repository secret** で以下を登録してください。

| Secret 名 | 値 | 必須 |
|---|---|---|
| `MAIL_USERNAME` | 送信元Gmailアドレス | ✅ |
| `MAIL_PASSWORD` | Gmailの**アプリパスワード**（通常のログインパスワード不可） | ✅ |
| `MAIL_TO` | 受信先メールアドレス | ✅ |
| `MAIL_SERVER` | SMTPサーバー（未設定なら `smtp.gmail.com`） | 任意 |
| `MAIL_PORT` | SMTPポート（未設定なら `465`） | 任意 |

### Gmailアプリパスワードの取得手順
1. Googleアカウントで **2段階認証** を有効にする（未設定の場合）
2. https://myaccount.google.com/apppasswords にアクセス
3. アプリ名（例: `space-news`）を入力して生成される **16桁のパスワード** を
   `MAIL_PASSWORD` に登録する

> `MAIL_USERNAME` が未登録の場合、メール送信ステップは自動的にスキップされます
> （Pages公開・アーカイブ生成は通常どおり動作します）。
> Gmail以外のSMTPも `MAIL_SERVER` / `MAIL_PORT` を設定すれば利用できます。

---

## 🔎 3. 動作確認

1. GitHub → **Actions** タブ → 「宇宙ニュース毎朝要約」
2. **Run workflow** で手動実行
3. 実行後に確認:
   - **Pages**: 公開URLが更新される（`deploy` ジョブのログにURL表示）
   - **メール**: `MAIL_TO` 宛に「🛰️ 宇宙ニュース要約 YYYY-MM-DD」が届く
   - **リポジトリ**: `space-news/digests/YYYY-MM-DD.md` / `.html` が追加コミットされる

以降は毎朝9時(JST)に自動で「収集 → 要約 → Pages更新 → メール送信」が実行されます。

---

## （任意）Claude による論説要約

`Settings → Secrets → Actions` に `ANTHROPIC_API_KEY` を登録すると、
「今日のまとめ」が Claude による論説要約になります（未登録でも見出しからの
自動要約で動作します）。

---

## 情報源・カテゴリの調整

- 情報源フィード: `space-news/sources.json` を編集
- カテゴリ分類のキーワード: `space-news/crawler.py` の `CATEGORIES` を編集

詳細は `space-news/README.md` を参照してください。
