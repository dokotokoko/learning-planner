# 探Qメイト - React版

AIを活用した探究学習支援アプリケーションのReact版です。Streamlitの制限を克服し、より柔軟で高機能なメモ&チャット統合UIを提供します。

## 🚀 新機能

### メモ&チャット統合UI
- **リサイズ可能な分割パネル**: 左側メモ、右側チャットのサイズを自由に調整
- **リアルタイム連携**: メモ内容がAI回答に自動反映
- **レスポンシブデザイン**: モバイルでは縦並び配置
- **スムーズなアニメーション**: Framer Motionによる美しいトランジション

### 探究学習の4ステップ
1. **Step 1: テーマ設定** - 興味から探究テーマを決定
2. **Step 2: 目標設定** - AIとの対話で学習目標を明確化
3. **Step 3: アイディエーション** - 活動計画の立案（サイドバーヒント付き）
4. **Step 4: まとめ** - 学習成果の整理と振り返り

### AI相談機能
- **統合メモ&チャット**: 相談内容をメモで整理しながらAIと対話
- **よくある相談例**: ワンクリックで典型的な質問を送信
- **カテゴリ別相談**: テーマ設定、目標・計画、研究方法の3カテゴリ

## 🛠️ 技術スタック

- **Frontend**: React 18 + TypeScript
- **UI Framework**: Material-UI (MUI) v5
- **Animation**: Framer Motion
- **Layout**: React Resizable Panels
- **State Management**: Zustand
- **Routing**: React Router v6
- **HTTP Client**: React Query
- **Build Tool**: Vite

## 📦 インストールと実行

### 前提条件
- Node.js 18.0以上
- npm または yarn

### セットアップ

1. 依存関係のインストール:
```bash
cd react-app
npm install
```

2. 開発サーバーの起動:
```bash
npm run dev
```

3. ブラウザで http://localhost:5173 を開く

### ビルド
```bash
npm run build
```

## 🎨 主要コンポーネント

### MemoChat
リサイズ可能なメモ&チャット統合コンポーネント
```tsx
<MemoChat
  pageId="step2"
  memoTitle="💭 思考メモ"
  memoPlaceholder="考えを整理してください..."
  chatPlaceholder="AIに質問してください..."
  initialMessage="初期メッセージ"
  onMessageSend={handleAIMessage}
/>
```

### StepPage
探究学習の各ステップを表示する統一コンポーネント
- ステップ別のメモ&チャットUI
- プログレスバー
- ナビゲーション機能

## 🌟 Streamlit版との違い

| 機能 | Streamlit版 | React版 |
|------|------------|---------|
| レイアウト | 固定 | リサイズ可能な分割パネル |
| レスポンシブ | 限定的 | 完全対応 |
| アニメーション | なし | Framer Motion |
| UI制御 | 制限あり | 完全カスタマイズ可能 |
| パフォーマンス | 中 | 高 |
| 開発効率 | 高 | 中 |

## 🔧 今後の実装予定

- [ ] Supabase連携（データ永続化）
- [ ] 実際のAI API統合
- [ ] PWA対応
- [ ] オフライン機能
- [ ] エクスポート機能（PDF、Word）
- [ ] チーム共有機能
- [ ] プラグインシステム

## 📁 プロジェクト構造

```
react-app/
├── src/
│   ├── components/
│   │   ├── MemoChat/          # メモ&チャット統合UI
│   │   ├── Layout/            # レイアウトコンポーネント
│   │   └── ...
│   ├── pages/
│   │   ├── StepPage.tsx       # 統一ステップページ
│   │   ├── GeneralInquiryPage.tsx  # AI相談ページ
│   │   └── ...
│   ├── stores/                # Zustand状態管理
│   ├── styles/                # グローバルスタイル
│   └── lib/                   # ユーティリティ
├── package.json
└── README.md
```

## 🚀 Getting Started

1. 新規ユーザー登録またはログイン
2. Step 1でテーマ設定
3. 各ステップでメモを書きながらAIと対話
4. パネルサイズを調整して最適な作業環境を構築

## 📱 モバイル対応

- タブレット: 縦並び自動切替
- スマートフォン: タッチ最適化UI
- PWA: ホーム画面追加対応（実装予定）

## 🎯 目標

Reactの柔軟性を活かして、AIコードエディターのような直感的で生産性の高い学習環境を提供することを目指しています。

---

**Note**: このアプリは教育目的で作成されており、実際のAI APIは現在モックアップです。本格運用の際は適切なAPI連携を行ってください。 