# 議論プラットフォーム

複数人でのリアルタイム議論ができるWebプラットフォームです。

## 機能

### 基本機能
- ✅ ルーム作成・参加
- ✅ リアルタイムメッセージング
- ✅ 参加者リスト表示
- ✅ メッセージへの「いいね」機能
- ✅ メッセージへの返信機能
- ✅ レスポンシブデザイン

### 今後の予定機能
- 🔄 AI統合（議論の要約、提案など）
- 🔄 ファイル添付機能
- 🔄 議論の構造化（カテゴリ分け）
- 🔄 投票機能
- 🔄 議論の結果エクスポート

## 技術スタック

### フロントエンド
- React 18 + TypeScript
- Vite
- Socket.io-client
- CSS3

### バックエンド
- Node.js + Express
- Socket.io
- メモリベースデータストレージ（開発用）

## セットアップ

### 前提条件
- Node.js 18以上
- npm または yarn

### インストール

1. リポジトリをクローン
```bash
git clone <repository-url>
cd discussion-platform
```

2. バックエンドのセットアップ
```bash
cd backend
npm install
```

3. フロントエンドのセットアップ
```bash
cd ../frontend
npm install
```

### 起動

1. バックエンドサーバーを起動（ポート3000）
```bash
cd backend
npm run dev
```

2. フロントエンドサーバーを起動（ポート5173）
```bash
cd frontend
npm run dev
```

3. ブラウザで `http://localhost:5173` にアクセス

## 使用方法

### ルームの作成
1. ホーム画面で「新しいルームを作成」セクションを使用
2. ルームタイトルとホスト名を入力
3. 「ルームを作成」ボタンをクリック
4. 自動的にルームに入室し、ルームIDが表示されます

### ルームへの参加
1. ホーム画面で「既存のルームに参加」セクションを使用
2. 8文字のルームIDとユーザー名を入力
3. 「ルームに参加」ボタンをクリック

### 議論の進行
1. メッセージ入力欄でテキストを入力し、Enterキーまたは「送信」ボタンで送信
2. 他の人のメッセージに「👍」ボタンでいいねできます
3. 「💬 返信」ボタンでメッセージに返信できます
4. サイドバーで参加者リストと接続状況を確認できます

## 開発

### ディレクトリ構造
```
discussion-platform/
├── backend/                 # バックエンドサーバー
│   ├── server.js           # メインサーバーファイル
│   ├── package.json
│   └── node_modules/
├── frontend/               # フロントエンドアプリ
│   ├── src/
│   │   ├── components/     # Reactコンポーネント
│   │   │   ├── Home.tsx
│   │   │   ├── Room.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── MessageList.tsx
│   │   │   └── MessageInput.tsx
│   │   ├── App.tsx
│   │   ├── App.css
│   │   └── main.tsx
│   ├── package.json
│   └── node_modules/
└── README.md
```

### Socket.ioイベント

#### クライアント → サーバー
- `join_room`: ルームに参加
- `send_message`: メッセージ送信
- `like_message`: メッセージにいいね
- `reply_message`: メッセージに返信

#### サーバー → クライアント
- `room_joined`: ルーム参加成功
- `new_message`: 新しいメッセージ受信
- `message_updated`: メッセージ更新（いいね・返信）
- `user_joined`: 新しいユーザー参加
- `user_left`: ユーザー退室
- `error`: エラー通知

## 注意事項

- 現在はメモリベースのデータストレージを使用しているため、サーバー再起動時にデータは失われます
- 本格運用する場合は、データベース（PostgreSQL、MongoDB等）の導入を推奨します
- セキュリティ機能（認証、バリデーション等）は最小限のため、本格運用前に強化が必要です

## ライセンス

MIT License 