# 探Qメイト FastAPI バックエンド

## 概要

AI探究学習支援アプリケーション「探Qメイト」のFastAPIバックエンドです。
ReactフロントエンドにデータとAI機能を提供します。

## 🚀 機能

### API エンドポイント

#### 認証
- `POST /auth/login` - ユーザーログイン

#### 興味関心管理
- `POST /interests` - 興味関心の保存
- `GET /interests` - ユーザーの興味関心一覧取得

#### 学習目標管理
- `POST /goals` - 学習目標の保存
- `GET /goals` - ユーザーの学習目標一覧取得

#### 学習計画管理
- `POST /learning-plans` - 学習計画の保存
- `GET /learning-plans` - ユーザーの学習計画一覧取得

#### AIチャット
- `POST /chat` - AIとの対話

#### メモ機能
- `POST /memos` - メモの保存
- `GET /memos/{page_id}` - 特定ページのメモ取得
- `GET /memos` - ユーザーの全メモ取得
- `DELETE /memos/{page_id}` - メモの削除

#### ヘルスチェック
- `GET /` - サーバー状態確認

## 🛠️ セットアップ

### 前提条件
- Python 3.8以上
- MySQL 8.0以上
- OpenAI APIキー

### インストール

1. 依存関係のインストール:
```bash
cd backend
pip install -r requirements.txt
```

2. 環境変数の設定:
```bash
# .envファイルを作成（backend/.envを参照）
cp .env.example .env
# .envファイルを編集してデータベース接続情報とAPIキーを設定
```

3. データベースの準備:
- MySQLサーバーを起動
- データベースを作成
- 必要に応じてユーザーテーブルにテストデータを投入

### 開発サーバーの起動

```bash
# backendディレクトリで実行
python main.py

# または
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

サーバーが起動すると以下のURLでアクセス可能です：
- API: http://localhost:8000
- API ドキュメント: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🗄️ データベーススキーマ

### users
- ユーザー情報

### interests
- ユーザーの興味関心

### goals
- 学習目標

### learning_plans
- 学習計画

### user_memos
- ページ別メモ

## 🔐 認証

現在は簡易認証（ユーザー名＋アクセスコード）を実装。
将来的にはJWTトークンベースの認証に移行予定。

## 🤖 AI統合

OpenAI GPT-4を使用してユーザーの学習をサポート：
- 探究テーマの具体化支援
- 学習目標設定のガイダンス
- 学習計画作成のアドバイス
- 一般的な学習相談対応

## 📡 CORS設定

React開発サーバー（localhost:5173）との通信を許可。
本番環境では適切にオリジンを制限してください。

## 🚨 エラーハンドリング

- 適切なHTTPステータスコードでレスポンス
- 詳細なエラーメッセージをログに記録
- フロントエンド向けにはユーザーフレンドリーなエラーメッセージを返却

## 📊 ログ

- アプリケーションログは標準出力に出力
- 本番環境では適切なログローテーション設定を推奨

## 🔄 開発ワークフロー

1. コードの変更
2. 自動リロードでサーバーが再起動
3. http://localhost:8000/docs でAPI仕様を確認
4. Reactアプリからの動作確認

## 📝 TODO

- [ ] JWT認証の実装
- [ ] レート制限の追加
- [ ] バリデーション強化
- [ ] テストケースの追加
- [ ] Docker化
- [ ] 本番環境用の設定

---

**注意**: このAPIは教育目的で作成されており、本格的な本番運用の際は追加のセキュリティ対策が必要です。 