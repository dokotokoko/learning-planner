# 探Qメイト - React版

※ 本機能はCalude4によって全自動で実装されたMocです。

※ この引き継ぎ書としてのREADME.mdも開発者が細かな開発を進めていく上での引き継ぎ書としてClaude4に自動生成してもらっています。

※ 開発者によるレビューはまだ行えていないことをご了承ください。

# AIを活用した探究学習支援アプリケーション（React版）

## 🌟 特徴

### 改善されたUI・UX
- **モダンなデザイン**: Material-UIを使用した美しいインターフェース
- **アニメーション**: Framer Motionによる滑らかなトランジション
- **レスポンシブ対応**: モバイルファーストのデザイン
- **ダークモード**: ユーザーの好みに応じたテーマ切り替え
- **PWA対応**: オフライン機能とアプリライクな体験

### 技術的改善
- **TypeScript**: 型安全性による開発効率向上
- **Zustand**: 軽量で効率的な状態管理
- **React Query**: データフェッチングの最適化
- **コンポーネント設計**: 再利用可能で保守性の高いアーキテクチャ

## 🚀 機能

### 探究学習4ステップ
1. **テーマ設定**: 興味から探究テーマを決定
2. **ゴール設定**: 学習目標を明確化
3. **アイディエーション**: 活動内容を計画
4. **まとめ**: 成果をまとめて振り返り

### AI対話サポート
- 各ステップでのAIアシスタント
- なんでも相談窓口
- 対話履歴の保存・管理

### ユーザー体験
- 進捗の可視化
- リアルタイムチャット
- アクセシビリティ対応
- 高速なページ遷移

## 📦 技術スタック

### フロントエンド
- **React 18**: 最新のReact機能を活用
- **TypeScript**: 型安全性とIntelliSense
- **Material-UI v5**: モダンなUIコンポーネント
- **Framer Motion**: 高品質なアニメーション
- **Vite**: 高速な開発環境

### 状態管理・データフェッチ
- **Zustand**: 軽量な状態管理ライブラリ
- **React Query**: サーバー状態管理
- **React Router**: SPA ルーティング

### バックエンド・データベース
- **Supabase**: リアルタイムデータベース
- **PostgreSQL**: 堅牢なリレーショナルDB

### 開発・デプロイ
- **Vite**: 開発サーバーとビルドツール
- **PWA**: プログレッシブウェブアプリ
- **ESLint + Prettier**: コード品質管理

## 🛠️ セットアップ

### 前提条件
- Node.js 18以上
- npm または yarn
- Supabaseアカウント

### インストール
```bash
# プロジェクトクローン
git clone <repository-url>
cd react-app

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local
# .env.localファイルを編集してSupabase設定を追加
```

### 環境変数
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 開発サーバー起動
```bash
npm run dev
```

### ビルド
```bash
npm run build
```

### プレビュー
```bash
npm run preview
```

## 📁 プロジェクト構造

```
src/
├── components/          # 再利用可能なコンポーネント
│   ├── Layout/         # レイアウト関連
│   ├── Chat/           # チャット機能
│   ├── Forms/          # フォームコンポーネント
│   └── Common/         # 共通コンポーネント
├── pages/              # ページコンポーネント
│   ├── LoginPage.tsx
│   ├── HomePage.tsx
│   ├── StepPage.tsx
│   └── GeneralInquiryPage.tsx
├── stores/             # 状態管理
│   ├── authStore.ts
│   ├── themeStore.ts
│   └── dataStore.ts
├── hooks/              # カスタムフック
├── lib/                # ライブラリ設定
│   ├── supabase.ts
│   └── llmApi.ts
├── styles/             # スタイルファイル
├── types/              # TypeScript型定義
└── utils/              # ユーティリティ関数
```

## 🎨 デザインシステム

### カラーパレット
- **Primary**: #73bbff (ブランドカラー)
- **Secondary**: #47d7ac (アクセントカラー)
- **Success**: #4caf50
- **Warning**: #ff9800
- **Error**: #f44336

### タイポグラフィ
- **フォント**: Noto Sans JP, Roboto
- **見出し**: 600 weight
- **本文**: 400 weight
- **キャプション**: 500 weight

### スペーシング
- **基本単位**: 8px
- **コンポーネント間**: 16px, 24px, 32px
- **セクション間**: 48px, 64px

## 🔧 開発ガイドライン

### コンポーネント設計
- 単一責任の原則を守る
- PropsとStateを明確に分離
- TypeScriptで型定義を必須とする
- ストーリーブック対応を推奨

### 状態管理
- ローカル状態: useState
- グローバル状態: Zustand
- サーバー状態: React Query
- フォーム状態: useForm (react-hook-form)

### スタイリング
- Material-UIのsxプロパティを優先
- カスタムテーマでブランド統一
- レスポンシブブレークポイントを活用

## 📱 PWA機能

### オフライン対応
- 基本ページのキャッシュ
- データの段階的同期
- ネットワーク状態の表示

### モバイル最適化
- タッチ操作の最適化
- ネイティブアプリライクなナビゲーション
- プッシュ通知（将来的）

## 🧪 テスト

### テスト戦略
- **Unit Tests**: Jest + React Testing Library
- **Integration Tests**: コンポーネント間の相互作用
- **E2E Tests**: Playwright（推奨）

### 実行コマンド
```bash
# ユニットテスト
npm run test

# E2Eテスト
npm run test:e2e

# カバレッジレポート
npm run test:coverage
```

## 🚀 デプロイ

### Vercel（推奨）
```bash
# Vercel CLIをインストール
npm i -g vercel

# デプロイ
vercel
```

### Netlify
```bash
# ビルド
npm run build

# distフォルダをNetlifyにデプロイ
```

## 🔒 セキュリティ

### 認証
- JWTトークンベース（Supabase）
- セッション管理の最適化
- CSRF保護

### データ保護
- 環境変数での機密情報管理
- XSS対策
- SQLインジェクション対策（Supabase RLS）

## 📈 パフォーマンス最適化

### バンドル最適化
- コード分割（React.lazy）
- 動的インポート
- Tree shaking

### リソース最適化
- 画像最適化（WebP対応）
- フォント最適化
- キャッシュ戦略

### レンダリング最適化
- React.memo によるメモ化
- useMemo / useCallback の適切な使用
- 仮想化リスト（長いリスト用）

## 🤝 貢献

### 開発プロセス
1. Issue作成
2. Feature ブランチ作成
3. 開発・テスト
4. Pull Request作成
5. コードレビュー
6. マージ

### コーディング規約
- ESLint + Prettier
- Conventional Commits
- TypeScript strict mode

## 📄 ライセンス

MIT License

## 🙋‍♂️ サポート

質問やバグレポートは [Issues](https://github.com/your-repo/issues) にお願いします。

---

**Streamlit版から React版への主な改善点:**

1. **パフォーマンス**: 必要な部分のみ再レンダリング
2. **ユーザビリティ**: 直感的なナビゲーションとアニメーション
3. **アクセシビリティ**: スクリーンリーダー対応、キーボードナビゲーション
4. **モバイル対応**: タッチ操作最適化、レスポンシブデザイン
5. **拡張性**: コンポーネントベース設計による保守性向上 