# 開発環境セットアップ手順

## 概要
探Qメイト（TanQMates）の開発環境をローカルで構築するための完全ガイドです。
Gitからクローンした直後から開発開始までの全手順を記載しています。

## 前提条件
- Git
- Docker Desktop
- Node.js (v18以上推奨)
- Python 3.10以上

## セットアップ手順

### 1. リポジトリのクローン
```bash
git clone https://github.com/your-username/learning-assistant.git
cd learning-assistant
```

### 2. 環境変数ファイルの作成

#### バックエンド用 .env ファイル
プロジェクトルートに `.env` ファイルを作成:
```bash
# プロジェクトルートで
touch .env
```

以下の内容を記入（実際の値は管理者から取得）:
```env
# Supabase設定
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# OpenAI API設定
OPENAI_API_KEY=your-openai-api-key

# 開発環境用設定（オプション）
ENABLE_CORS=false  # Docker環境では不要
```

#### フロントエンド用環境変数
`react-app/.env` ファイルを作成:
```bash
cd react-app
touch .env
```

以下の内容を記入:
```env
# API エンドポイント（Docker環境の場合）
VITE_API_URL=https://dev.tanqmates.local.test/api

# 直接アクセスする場合（非Docker）
# VITE_API_URL=http://localhost:8000
```

### 3. 必要なディレクトリ構造の作成

```bash
# プロジェクトルートで
mkdir -p nginx/certs
mkdir -p backend/logs
mkdir -p react-app/dist
```

### 4. SSL証明書の生成（Docker環境用）

#### mkcertのインストール
```bash
# Windows (Chocolatey)
choco install mkcert

# Mac (Homebrew)
brew install mkcert

# Linux
# https://github.com/FiloSottile/mkcert#installation を参照
```

#### 証明書の生成
```bash
# mkcertのCA証明書をシステムに登録
mkcert -install

# 証明書の生成
cd nginx/certs
mkcert dev.tanqmates.local.test

# ファイル名を統一
mv dev.tanqmates.local.test.pem cert.pem
mv dev.tanqmates.local.test-key.pem key.pem

# プロジェクトルートに戻る
cd ../..
```

### 5. hostsファイルの編集

#### Windows
管理者権限でメモ帳を開き、以下のファイルを編集:
```
C:\Windows\System32\drivers\etc\hosts
```

#### Mac/Linux
```bash
sudo nano /etc/hosts
```

以下の行を追加:
```
127.0.0.1 dev.tanqmates.local.test
```

### 6. 依存関係のインストール

#### バックエンド（Python）
```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
cd ..
```

#### フロントエンド（React）
```bash
cd react-app
npm install
cd ..
```

## 起動方法

### Docker環境で起動（推奨）

```bash
# 開発環境の起動（初回はビルド含む）
docker-compose -f docker-compose.dev.yml up --build

# バックグラウンドで起動する場合
docker-compose -f docker-compose.dev.yml up -d --build

# ログを確認
docker-compose -f docker-compose.dev.yml logs -f
```

アクセスURL:
```
https://dev.tanqmates.local.test
```

### 直接起動（非Docker環境）

#### バックエンド起動
```bash
cd backend
# 仮想環境を有効化
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

# 起動
python main.py
# または
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### フロントエンド起動
```bash
cd react-app
npm run dev
```

アクセスURL:
```
http://localhost:3000
```

## アーキテクチャ

### Docker環境
```
[ブラウザ] 
    ↓
https://dev.tanqmates.local.test
    ↓
[Nginx (リバースプロキシ)]
    ├── /api/* → [Backend:8000]
    └── /* → [Frontend:5173]
```

### 直接起動環境
```
[ブラウザ]
    ├── http://localhost:5173 → [Frontend]
    └── http://localhost:8000 → [Backend API]
```

## 環境の停止

### Docker環境
```bash
# コンテナの停止
docker-compose -f docker-compose.dev.yml down

# ボリュームも含めて完全にクリーンアップ
docker-compose -f docker-compose.dev.yml down -v
```

### 直接起動環境
各ターミナルで `Ctrl+C` で停止

## トラブルシューティング

### 証明書の警告が出る場合
1. `mkcert -install` が実行されているか確認
2. ブラウザを完全に再起動
3. それでも解決しない場合は、証明書を再生成

### APIアクセスできない場合
```bash
# Docker環境のログ確認
docker-compose -f docker-compose.dev.yml logs backend
docker-compose -f docker-compose.dev.yml logs nginx

# ネットワーク確認
docker network ls
docker network inspect learning-assistant_default
```

### ポート競合の場合
```bash
# 使用中のポート確認（Windows）
netstat -an | findstr :8000
netstat -an | findstr :3000
netstat -an | findstr :443

# 使用中のポート確認（Mac/Linux）
lsof -i :8000
lsof -i :3000
lsof -i :443
```

### Supabaseに接続できない場合
1. `.env` ファイルの `SUPABASE_URL` と `SUPABASE_KEY` を確認
2. Supabaseダッシュボードでプロジェクトのステータスを確認
3. IPアドレス制限がある場合は、ローカルIPを許可リストに追加

### フロントエンドのビルドエラー
```bash
cd react-app
# キャッシュクリア
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Dockerイメージの再ビルド
```bash
# キャッシュを使わずに完全に再ビルド
docker-compose -f docker-compose.dev.yml build --no-cache
```

## データベース構造の確認
Supabaseダッシュボードにアクセスして、以下のテーブルが存在することを確認:
- users
- projects
- memos
- chat_logs
- chat_conversations
- quests
- user_quests
- quest_submissions
- user_learning_profiles

## 開発のヒント

### ホットリロード
- **バックエンド**: uvicornの`--reload`オプションで自動リロード
- **フロントエンド**: Viteが自動的にホットリロード対応

### ログの確認
```bash
# Docker環境
docker-compose -f docker-compose.dev.yml logs -f backend

# 直接起動環境
# backend/logs/ ディレクトリ内のログファイルを確認
```

### APIドキュメント
バックエンドが起動している状態で以下にアクセス:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 本番環境との違い

| 項目 | 開発環境 | 本番環境 |
|------|----------|----------|
| URL | https://dev.tanqmates.local.test | https://demo.tanqmates.org |
| SSL証明書 | mkcert (自己署名) | Cloudflare |
| CORS | 無効（同一オリジン） | 有効 |
| デバッグ | 有効 | 無効 |
| ログレベル | DEBUG/INFO | WARNING/ERROR |

## よくある質問

### Q: `.env`ファイルの値はどこで取得できますか？
A: プロジェクト管理者に問い合わせるか、Supabaseで新規プロジェクトを作成してください。

### Q: Dockerを使わずに開発できますか？
A: はい、可能です。「直接起動（非Docker環境）」の手順に従ってください。

### Q: Windows以外のOSでも動作しますか？
A: はい、Mac/Linuxでも動作します。適宜コマンドを読み替えてください。

## サポート
問題が解決しない場合は、GitHubのIssuesに報告してください。
