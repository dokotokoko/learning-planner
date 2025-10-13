# 探Qメイト 使い方ページ - ローカル環境テスト手順

## 概要
このドキュメントは、新しく実装した「使い方ページ」をローカル開発環境（dev.tanqmates.local.test）で確認するための手順書です。

## 実装内容

### ルーティング構成の変更
- **`/`** - 使い方ページ（認証不要）
- **`/login`** - ログインページ  
- **`/app/*`** - アプリケーション本体（認証必要）

### 作成したコンポーネント
```
react-app/src/
├── pages/
│   └── GuidePage.tsx         # メインの使い方ページ
└── components/
    └── Guide/
        ├── HeroSection.tsx       # ヒーローセクション
        ├── WhyNeededSection.tsx  # なぜ必要かセクション
        ├── HowToUseSection.tsx   # どう使うかセクション
        ├── ResultsSection.tsx    # 結果の見え方セクション
        └── CTASection.tsx        # 行動喚起セクション
```

## Docker環境での確認手順

### 1. Docker環境の起動

```bash
# プロジェクトルートで実行
docker-compose -f docker-compose.dev.yml up --build

# バックグラウンドで起動する場合
docker-compose -f docker-compose.dev.yml up -d --build
```

### 2. アクセス確認

#### 使い方ページ（新規実装）
```
https://dev.tanqmates.local.test/
```
- **確認ポイント:**
  - ヒーローセクションが表示される
  - 「なぜ必要か」「どう使うか」「結果の見え方」セクションが順に表示される
  - スムーズスクロールが動作する
  - 「探Qメイトを始める」ボタンをクリックすると `/login` へ遷移

#### ログインページ
```
https://dev.tanqmates.local.test/login
```
- **確認ポイント:**
  - ログイン済みの場合は `/app` へリダイレクトされる
  - 未ログインの場合はログインフォームが表示される

#### アプリケーション本体
```
https://dev.tanqmates.local.test/app
```
- **確認ポイント:**
  - 認証が必要（未ログインの場合は `/login` へリダイレクト）
  - ログイン後はダッシュボードが表示される
  - すべてのアプリ機能が `/app` 以下で動作する

## ナビゲーションパスの確認

### 修正済みパス一覧
| コンポーネント | 旧パス | 新パス |
|---|---|---|
| DashboardPage | `/projects/{id}` | `/app/projects/{id}` |
| ProjectPage | `/projects/{id}/memos/{id}` | `/app/projects/{id}/memos/{id}` |
| StepPage | `/step/{number}` | `/app/step/{number}` |
| HomePage | `/step/1`, `/inquiry`, `/profile` | `/app/step/1`, `/app/inquiry`, `/app/profile` |
| Layout | `/dashboard`, `/framework-games/*` | `/app/dashboard`, `/app/framework-games/*` |

## テストシナリオ

### シナリオ1: 初回訪問者のフロー
1. `https://dev.tanqmates.local.test/` にアクセス
2. 使い方ページが表示されることを確認
3. 各セクションをスクロールで閲覧
4. 「探Qメイトを始める」ボタンをクリック
5. ログインページへ遷移することを確認
6. ログイン後、`/app` へ遷移することを確認

### シナリオ2: ログイン済みユーザーのフロー
1. ログイン済みの状態で `https://dev.tanqmates.local.test/` にアクセス
2. 使い方ページが表示される（認証不要）
3. 「探Qメイトを始める」ボタンをクリック
4. 直接 `/app` へ遷移することを確認

### シナリオ3: アプリ内ナビゲーション
1. `/app/dashboard` にアクセス
2. プロジェクトをクリックして `/app/projects/{id}` へ遷移
3. メモを作成・クリックして `/app/projects/{id}/memos/{id}` へ遷移
4. すべてのナビゲーションが `/app` 以下で動作することを確認

## トラブルシューティング

### 使い方ページが表示されない場合
```bash
# コンテナのログを確認
docker-compose -f docker-compose.dev.yml logs frontend

# フロントエンドの再ビルド
docker-compose -f docker-compose.dev.yml up --build frontend
```

### ルーティングが正しく動作しない場合
```bash
# Nginxのログを確認
docker-compose -f docker-compose.dev.yml logs nginx

# キャッシュをクリアしてブラウザを再起動
```

### 404エラーが発生する場合
- ブラウザのキャッシュをクリア
- `Ctrl + Shift + R` でハード再読み込み
- React Routerの設定を確認

## 開発時の注意点

### パスの指定
- アプリ内のナビゲーションは必ず `/app` プレフィックスを付ける
- 例: `navigate('/app/dashboard')` 

### 認証の扱い
- `/` と `/login` は認証不要
- `/app/*` 以下はすべて認証必要

### APIアクセス
- APIエンドポイントは `/api/*` のまま変更なし
- Nginxが適切にバックエンドへルーティング

## レスポンシブデザインの確認

### デバイス別確認ポイント
- **デスクトップ（1920px以上）**: 全セクションが最適に表示
- **タブレット（768px-1024px）**: レイアウトが適切に調整
- **モバイル（375px-767px）**: 縦スクロールで快適に閲覧可能

### ブラウザ開発者ツールでの確認
```
1. F12 で開発者ツールを開く
2. デバイスモードトグル（Ctrl+Shift+M）
3. 各デバイスサイズで表示確認
```

## 確認済み環境
- Docker Desktop 4.x
- Chrome 120+
- Firefox 120+
- Edge 120+

## フィードバック・問題報告
問題を発見した場合は、以下の情報を含めて報告してください：
1. ブラウザとバージョン
2. アクセスしたURL
3. エラーメッセージやスクリーンショット
4. 再現手順