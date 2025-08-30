# 開発環境セットアップ手順

## 概要
本番環境と同等の環境をローカルで構築し、CORS問題を回避しながら安全に開発を行うための設定です。

## アーキテクチャ
```
[ブラウザ] → https://dev.tanqmates.local.test → [Nginx] → /api → [Backend:8000]
                                                      ↓
                                                     / → [Frontend:5173]
```

## セットアップ手順

### 1. hostsファイルの編集
Windowsの場合、管理者権限で以下のファイルを編集:
```
C:\Windows\System32\drivers\etc\hosts
```

以下の行を追加:
```
127.0.0.1 dev.tanqmates.local.test
```

### 2. 証明書の生成（mkcert使用）
```bash
# mkcertのインストール（未インストールの場合）
# Windows (Chocolatey)
choco install mkcert

# mkcertのCA証明書をシステムに登録
mkcert -install

# 証明書の生成
cd nginx/certs
mkcert dev.tanqmates.local.test
# cert.pemとkey.pemにリネーム
mv dev.tanqmates.local.test.pem cert.pem
mv dev.tanqmates.local.test-key.pem key.pem
```

### 3. 環境変数の設定
`.env`ファイルが正しく設定されていることを確認:
```env
SUPABASE_URL=https://wttynclovrmxlbbdxzcd.supabase.co
SUPABASE_KEY=your_supabase_key
OPENAI_API_KEY=your_openai_key
```

### 4. Docker Composeで起動
```bash
# 開発環境の起動
docker-compose -f docker-compose.dev.yml up --build

# バックグラウンドで起動する場合
docker-compose -f docker-compose.dev.yml up -d --build
```

### 5. アクセス確認
ブラウザで以下にアクセス:
```
https://dev.tanqmates.local.test
```

## 環境の停止
```bash
docker-compose -f docker-compose.dev.yml down
```

## トラブルシューティング

### 証明書の警告が出る場合
- `mkcert -install`が実行されているか確認
- ブラウザを再起動

### APIアクセスできない場合
- Docker コンテナのログを確認: `docker-compose -f docker-compose.dev.yml logs backend`
- Nginxのログを確認: `docker-compose -f docker-compose.dev.yml logs nginx`

### ポート競合の場合
- 既存のサービスを停止するか、docker-compose.dev.ymlのポート設定を変更

## 本番環境との違い
- URL: `https://dev.tanqmates.local.test` (本番: `https://demo.tanqmates.org`)
- CORS: 無効（同一オリジンのため不要）
- 証明書: mkcertによるローカル証明書（本番: Cloudflare）