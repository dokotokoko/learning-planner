# React版 探Qメイト 開発引き継ぎガイド

## 📚 概要

**探Qメイト**は、AIを活用した探究学習支援アプリケーションです。このドキュメントでは、React版の開発を引き継ぐ初心者開発者向けに、プロジェクトの構造、技術スタック、実装内容、および残っているタスクについて詳しく解説します。

## 🚀 プロジェクト概要

### アプリケーションの目的
- 探究学習を4つのステップに分けて段階的にサポート
- AIアシスタントとの対話を通じて学習を促進
- 学習履歴と進捗を管理

### 学習の4ステップ
1. **テーマ設定**: 興味から探究テーマを決定
2. **ゴール設定**: 学習目標を明確化
3. **アイディエーション**: 活動内容を計画
4. **まとめ**: 成果をまとめて振り返り

## 🛠️ 技術スタック

### フロントエンド
- **React 18**: メインのUIライブラリ
- **TypeScript**: 型安全性を提供
- **Material-UI (MUI)**: UIコンポーネントライブラリ
- **React Router**: ページルーティング
- **Framer Motion**: アニメーション
- **Zustand**: 軽量な状態管理

### バックエンド・データベース
- **Supabase**: バックエンドサービス（認証・データベース）

### 開発ツール
- **Vite**: 高速なビルドツール
- **ESLint**: コード品質チェック

## 📁 プロジェクト構造

```
react-app/
├── src/
│   ├── components/          # 再利用可能なコンポーネント
│   │   ├── Layout/         # レイアウト関連
│   │   │   ├── Layout.tsx          # メインレイアウト
│   │   │   └── StepProgressBar.tsx # ステップ進捗バー
│   │   ├── LoadingScreen.tsx       # ローディング画面
│   │   └── ProtectedRoute.tsx      # 認証が必要なルート
│   ├── pages/              # ページコンポーネント
│   │   ├── HomePage.tsx           # ホーム画面
│   │   ├── LoginPage.tsx          # ログイン・登録画面
│   │   ├── StepPage.tsx           # 各ステップ画面
│   │   └── GeneralInquiryPage.tsx # 汎用相談画面
│   ├── stores/             # 状態管理
│   │   ├── authStore.ts           # 認証状態
│   │   └── themeStore.ts          # テーマ設定
│   ├── lib/                # 外部サービス接続
│   │   └── supabase.ts            # Supabase設定
│   ├── styles/             # スタイル定義
│   │   └── global.css             # グローバルスタイル
│   ├── App.tsx             # ルートコンポーネント
│   ├── main.tsx            # エントリーポイント
│   └── vite-env.d.ts       # 型定義
├── index.html              # HTMLテンプレート
├── package.json            # 依存関係
├── vite.config.ts          # Vite設定
└── .env                    # 環境変数（作成が必要）
```

## 🎯 各ファイルの役割と理解ポイント

### 1. エントリーポイント (`src/main.tsx`)

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**理解ポイント:**
- ReactアプリケーションのスタートPoint
- `React.StrictMode`で開発時の問題を早期発見
- グローバルCSSを読み込み

### 2. メインアプリケーション (`src/App.tsx`)

**主要な責務:**
- ルーティング設定（React Router）
- テーマ設定（Material-UI）
- 認証状態の管理
- グローバルプロバイダーの設定

**理解ポイント:**
```typescript
// 認証状態に基づいたルーティング
<Route 
  path="/login" 
  element={user ? <Navigate to="/" replace /> : <LoginPage />} 
/>

// 保護されたルート（ログインが必要）
<Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
  <Route index element={<HomePage />} />
  <Route path="step/:stepNumber" element={<StepPage />} />
</Route>
```

### 3. 状態管理 (Zustand)

#### 認証ストア (`src/stores/authStore.ts`)

```typescript
interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{success: boolean; error?: string}>;
  register: (username: string, password: string, confirmPassword: string) => Promise<{success: boolean; error?: string}>;
  logout: () => void;
}
```

**理解ポイント:**
- Zustandは軽量で使いやすい状態管理ライブラリ
- `persist`ミドルウェアでブラウザストレージに自動保存
- 非同期関数でSupabaseとの通信を処理

#### テーマストア (`src/stores/themeStore.ts`)

```typescript
interface ThemeState {
  isDarkMode: boolean;
  primaryColor: string;
  fontSize: 'small' | 'medium' | 'large';
  toggleDarkMode: () => void;
  setPrimaryColor: (color: string) => void;
}
```

### 4. ページコンポーネント

#### ホームページ (`src/pages/HomePage.tsx`)

**主要機能:**
- ユーザーの進捗表示
- クイックアクション（探究開始、続行、相談）
- ステップ一覧表示

**React開発のポイント:**
```typescript
// useNavigate フック（ページ遷移）
const navigate = useNavigate();
const handleQuickAction = () => navigate('/step/1');

// Framer Motionでアニメーション
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6 }}
>
```

#### ログインページ (`src/pages/LoginPage.tsx`)

**主要機能:**
- タブ切り替え（ログイン/新規登録）
- フォーム管理とバリデーション
- 認証処理

**React開発のポイント:**
```typescript
// useState フック（状態管理）
const [tabValue, setTabValue] = useState(0);
const [loginData, setLoginData] = useState({
  username: '',
  password: '',
});

// フォーム送信処理
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  const result = await login(loginData.username, loginData.password);
  if (!result.success) {
    setError(result.error);
  }
};
```

### 5. コンポーネント設計

#### レイアウトコンポーネント (`src/components/Layout/Layout.tsx`)

**責務:**
- ヘッダー・サイドバー・メインコンテンツの配置
- ナビゲーション機能
- レスポンシブデザイン

#### 保護されたルート (`src/components/ProtectedRoute.tsx`)

```typescript
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuthStore();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};
```

**理解ポイント:**
- 認証が必要なページへのアクセス制御
- ローディング状態とリダイレクト処理

## 🔧 開発環境の設定

### 1. 必要な環境変数

`.env`ファイルを作成し、以下を設定:

```env
VITE_SUPABASE_URL=あなたのSupabaseプロジェクトURL
VITE_SUPABASE_ANON_KEY=あなたのSupabaseの匿名キー
```

### 2. 開発サーバーの起動

```bash
cd react-app
npm install
npm run dev
```

### 3. ビルド

```bash
npm run build
```

## 📋 実装済み機能

### ✅ 完了している機能

1. **認証システム**
   - ユーザー登録・ログイン
   - セッション管理
   - 保護されたルート

2. **基本UI構造**
   - レスポンシブレイアウト
   - ナビゲーション
   - ステップ進捗バー
   - ダークモード対応

3. **ページ構成**
   - ログイン/登録ページ
   - ホームページ
   - ステップページ（基本構造）
   - 汎用相談ページ（基本構造）

4. **状態管理**
   - 認証状態管理
   - テーマ設定管理

5. **スタイリング**
   - Material-UIテーマ設定
   - グローバルスタイル
   - アニメーション効果

## 🚧 実装が必要なタスク

### 高優先度 (必須機能)

1. **Step 1: テーマ設定機能**
   ```typescript
   // 実装が必要な機能
   interface Interest {
     id: string;
     text: string;
     category: string;
   }
   
   // AIとの対話でテーマを決定
   // 興味の入力 → AI分析 → テーマ提案 → 決定
   ```

2. **Step 2: ゴール設定機能**
   ```typescript
   // 実装が必要な機能
   interface Goal {
     id: string;
     interest_id: string;
     description: string;
     criteria: string[];
   }
   
   // テーマに基づいてゴールを設定
   // AIとの対話でゴールを明確化
   ```

3. **Step 3: アイディエーション機能**
   ```typescript
   // 実装が必要な機能
   interface LearningPlan {
     id: string;
     goal_id: string;
     activities: Activity[];
     timeline: string;
   }
   
   // ゴールを達成するための活動計画
   // AIとの対話で具体的な活動を提案
   ```

4. **Step 4: まとめ機能**
   ```typescript
   // 実装が必要な機能
   interface Summary {
     id: string;
     plan_id: string;
     reflection: string;
     achievements: string[];
     next_steps: string[];
   }
   
   // 学習の振り返りと成果まとめ
   ```

5. **AI チャット機能**
   ```typescript
   // 各ステップで必要
   interface ChatMessage {
     id: string;
     sender: 'user' | 'ai';
     message: string;
     timestamp: Date;
   }
   
   // OpenAI API または同等のサービスとの連携
   ```

### 中優先度 (ユーザビリティ向上)

1. **データ永続化の強化**
   - 進捗データの自動保存
   - 下書き機能
   - データエクスポート機能

2. **UIの改善**
   - より詳細なアニメーション
   - レスポンシブデザインの最適化
   - アクセシビリティの向上

3. **ユーザー体験の向上**
   - チュートリアル機能
   - ヘルプ機能
   - 進捗の可視化改善

### 低優先度 (追加機能)

1. **ソーシャル機能**
   - 学習成果の共有
   - 他のユーザーとの交流

2. **管理機能**
   - 管理者ダッシュボード
   - 使用統計

## 🎨 UIカスタマイズガイド

### Material-UIテーマのカスタマイズ

`src/App.tsx`のテーマ設定を変更することで、アプリ全体の見た目を変更できます：

```typescript
const theme = createTheme({
  palette: {
    primary: {
      main: '#73bbff', // メインカラーを変更
    },
    secondary: {
      main: '#47d7ac', // セカンダリカラーを変更
    },
  },
  typography: {
    fontFamily: '"Noto Sans JP", "Roboto"', // フォントを変更
  },
});
```

### コンポーネントのスタイル変更

Material-UIコンポーネントのスタイルは`sx`プロパティで変更可能：

```typescript
<Button
  sx={{
    backgroundColor: 'primary.main',
    '&:hover': {
      backgroundColor: 'primary.dark',
    },
    borderRadius: 2,
  }}
>
  ボタン
</Button>
```

### アニメーションの追加

Framer Motionを使用してアニメーションを追加：

```typescript
<motion.div
  initial={{ opacity: 0, scale: 0.8 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.5 }}
  whileHover={{ scale: 1.05 }}
>
  アニメーション付きコンテンツ
</motion.div>
```

## 🔍 デバッグとトラブルシューティング

### よくある問題と解決方法

1. **環境変数が読み込まれない**
   - `.env`ファイルがプロジェクトルートにあることを確認
   - 開発サーバーを再起動
   - 変数名が`VITE_`で始まることを確認

2. **Supabase接続エラー**
   - URLとキーが正しいことを確認
   - ブラウザの開発者ツールでネットワークエラーを確認

3. **型エラー**
   - `npm run build`でTypeScriptエラーを確認
   - `vite-env.d.ts`で必要な型定義を追加

### 開発者ツールの活用

1. **React Developer Tools**
   - コンポーネントの状態確認
   - プロップスの確認

2. **ブラウザの開発者ツール**
   - ネットワークタブでAPI通信確認
   - コンソールでエラー確認

## 📖 React学習リソース

### 基礎概念の理解に役立つリソース

1. **React公式ドキュメント**: https://react.dev/
2. **TypeScript公式ドキュメント**: https://www.typescriptlang.org/docs/
3. **Material-UI公式ドキュメント**: https://mui.com/
4. **Zustand公式ドキュメント**: https://zustand-demo.pmnd.rs/

### 実装時の参考例

このプロジェクトのコードを読む際の順序：
1. `App.tsx` - アプリの全体構造
2. `stores/authStore.ts` - 状態管理の理解
3. `pages/HomePage.tsx` - コンポーネント設計の理解
4. `components/Layout/Layout.tsx` - レイアウト設計

## 🤝 開発のベストプラクティス

### コード規約

1. **ファイル命名**
   - コンポーネント: PascalCase (`HomePage.tsx`)
   - 関数・変数: camelCase (`handleLogin`)
   - 定数: UPPER_SNAKE_CASE (`API_ENDPOINT`)

2. **コンポーネント設計**
   - 単一責任の原則
   - プロップスの型定義
   - デフォルトプロップスの設定

3. **状態管理**
   - ローカル状態は`useState`
   - グローバル状態はZustand
   - 非同期処理は適切なエラーハンドリング

### Git使用方法

```bash
# 機能ブランチの作成
git checkout -b feature/step1-implementation

# コミット
git add .
git commit -m "feat: implement step1 theme selection"

# プッシュ
git push origin feature/step1-implementation
```

## 🎯 次のステップ

1. **開発環境の確認**
   - すべての依存関係がインストールされている
   - 環境変数が正しく設定されている
   - 開発サーバーが正常に起動する

2. **コードの理解**
   - 各ファイルの役割を把握
   - 状態管理の仕組みを理解
   - Material-UIの基本的な使い方を習得

3. **最初の実装タスク**
   - Step 1のテーマ設定機能から開始することを推奨
   - 簡単なフォームから始めて、徐々にAI機能を追加

このガイドを参考に、React開発の理解を深めながら、探Qメイトの機能を完成させてください。質問があれば、コードにコメントを追加したり、ドキュメントを更新したりして、知識を共有してください。 