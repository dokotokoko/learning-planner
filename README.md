# 学習支援アシスタント

AIを活用した探究学習支援アプリケーションです。探究テーマから学習目標の設定、学習計画の作成までを対話形式でサポートします。

## 機能仕様

- **ユーザー管理**: シンプルなユーザー登録・ログイン機能により、ユーザー別に学習内容を管理します。
- **探究テーマの登録**: ユーザーが興味のある探究テーマを登録できます。
- **目標設定**: AIとの対話を通じて、探究テーマに基づいた具体的な学習目標を設定します。
- **学習内容の具体化**: AIとの対話により探究学習の内容を具体化し、実践可能な形に整理します。
- **ユーザーデータの永続化**: すべての学習記録がデータベースに保存され、いつでも続きから再開できます。
- **なんでも相談窓口**: 探究学習に関するあらゆる疑問や悩みをAIに相談できる機能です。

## 技術仕様

- **Streamlit**: Pythonベースのウェブアプリケーションフレームワーク
- **Supabase**: BaaS (Backend as a Service) プラットフォームによるデータ永続化と認証
- **OpenAI API**: GPT-4oモデルを使用した対話型学習支援
- **Python**: バックエンド処理とAI連携

## セットアップと起動方法

### 前提条件
- Python 3.9以上
- OpenAI APIキー

### インストール手順

1. リポジトリをクローンまたはダウンロードします。
```
git clone https://github.com/dokotokoko/learning-planner.git
cd learning-planner
```

2. 必要なパッケージをインストールします。
```
pip install -r requirements.txt
```

3. OpenAI APIキーとSupabase接続情報を設定します。
   - `.streamlit`ディレクトリを作成し、その中に`secrets.toml`ファイルを作成します。
   - 以下の内容を記述します（引用符内に自分のAPIキーとSupabaseの情報を設定）。Supabaseの情報は、Supabaseプロジェクトの「Project Settings > API」で確認できます。
```toml
OPENAI_API_KEY = "sk-あなたのAPIキー"

SUPABASE_URL = "YOUR_SUPABASE_URL"
SUPABASE_KEY = "YOUR_SUPABASE_KEY"
```

### 起動方法

```
streamlit run app.py
```

アプリケーションはデフォルトで`http://localhost:8501`で起動します。

### データベース
- アプリケーションのデータはSupabase上に保存・管理されます。
- テーブル構成:
  - `users`: ユーザー情報を保存
  - `interests`: ユーザーの探究テーマを保存
  - `goals`: 学習目標を保存
  - `learning_plans`: 学習計画を保存
  - `chat_logs`: AIとの対話ログを保存

## 使用方法

1. **ログイン/登録**:
   - 既存ユーザーの場合は、ユーザー名とアクセスコードでログイン
   - 新規ユーザーの場合は、「新規ユーザー登録」タブからアカウントを作成

2. **探究テーマの登録（ステップ1）**:
   - 探究学習のテーマを入力します
   - 「次へ」ボタンをクリックして続行します

3. **目標設定（ステップ2）**:
   - AIとの3回の対話を通じて学習目標を具体化します
   - 対話完了後、最終的な学習目標を整理して保存します
   - 「次へ」ボタンをクリックして次のステップに進みます

4. **学習内容の具体化（ステップ3）**:
   - AIとの対話を通じて探究学習の内容を具体化します
   - 対話完了後、活動内容を整理して保存します
   - 「次へ」ボタンをクリックして次のステップに進みます

5. **まとめ（ステップ4）**:
   - これまでの探究活動（テーマ、目標、活動内容）を一覧で確認します。

**なんでも相談窓口**:
- サイドバーまたはホームページからアクセスできます。
- 探究学習に関する困りごとや疑問点を自由に入力し、AIアシスタントからアドバイスを得られます。

## デプロイ方法

Streamlit Cloudでデプロイする場合：

1. GitHubリポジトリにコードをプッシュします
2. Streamlit Cloudにログインし、リポジトリを連携します
3. デプロイ設定で以下を指定します:
   - メインファイル: `app.py`
   - Python バージョン: 3.9以上
4. シークレット設定で以下のTOML形式でAPIキーとSupabase接続情報を設定します:
```toml
OPENAI_API_KEY = "sk-あなたのAPIキー"

SUPABASE_URL = "YOUR_SUPABASE_URL"
SUPABASE_KEY = "YOUR_SUPABASE_KEY"
```

## エラー対応

- **OpenAI APIキーエラー**: `.streamlit/secrets.toml`ファイルのAPIキーが正しく設定されているか確認してください。
- **Supabase接続エラー**: `.streamlit/secrets.toml`ファイルのSupabase URLとKeyが正しく設定されているか、またはStreamlit Cloudのシークレット設定を確認してください。
- **データベースエラー**: Supabaseのテーブル定義やポリシー設定を確認してください。
- **ユーザー認証エラー**: ユーザー名とアクセスコードが正しいか確認してください。

## ファイル構成

- `app.py`: メインアプリケーションファイル
- `requirements.txt`: 必要なPythonパッケージの一覧
- `.streamlit/secrets.toml`: APIキーなどの機密情報（Gitリポジトリには含めないこと）
- `module/`: アプリケーションの主要ロジックを含むモジュール群
  - `streamlit_api.py`: StreamlitのUI関連処理
  - `llm_api.py`: OpenAI API関連処理
- `prompt/`: LLMへの指示プロンプトを管理
  - `prompt.py`: 各種プロンプト定義

## .gitignore 推奨設定

以下のファイルはGitリポジトリに含めないことをお勧めします：

```
# Streamlit関連
.streamlit/secrets.toml

# データベース (ローカル開発用SQLiteなど)
*.db
*.sqlite
IBL-assistant.db

# 環境変数
.env

# Python関連
__pycache__/
*.py[cod]
venv/
```

## ライセンス

MIT 