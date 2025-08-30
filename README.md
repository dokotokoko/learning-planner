# 🎓 探Qメイト - AI-Powered Inquiry Learning Platform

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.6-green.svg)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue.svg)](https://www.typescriptlang.org/)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](CONTRIBUTING.md)

> **探究学習を革新する AI 対話型学習支援プラットフォーム**

探Qメイトは、学生の探究学習を伴走するAIパートナーです。

## ✨ なぜ探Qメイトなのか？

### 🎯 解決する課題
- **探究学習の方向性に迷う学生**：何から始めればいいかわからない
- **個別指導の限界**：教師一人では全員を十分にサポートできない  
- **学習プロセスの可視化不足**：進捗や思考過程が見えにくい
- **継続的な振り返りの困難さ**：適切なタイミングでの内省支援が難しい

### 💡 私たちのソリューション
- **AI メンター**：24時間利用可能な対話型学習支援
- **プロジェクトベース学習**：複数のメモとプロジェクトの統合管理
- **可視化ツール**：思考フレームワークとマインドマップ
- **クエストシステム**：ゲーミフィケーションによる学習動機向上

## 🚀 主要機能

### 🤖 AI 対話機能
- **リアルタイム支援**：学習中の疑問を即座に解決
- **プロジェクト文脈理解**：メモとプロジェクト情報を考慮した対話
- **軽量化最適化**：高速レスポンスのための最適化実装

### 📝 統合メモシステム
- **プロジェクト連携**：メモを特定のプロジェクトに関連付け
- **マルチメモ管理**：複数のメモを同時に管理・編集
- **自動保存**：作業の中断を気にせず集中
- **Markdown 対応**：構造化された美しいノート

### 🎮 思考フレームワークツール
- **テーマ深掘りツール**：段階的にテーマを具体化
- **マインドマップ**：アイデアの視覚的整理  
- **インタラクティブ探索**：AIサポートによる思考の拡張

### 🏆 クエストシステム
- **学習クエスト**：段階的な学習目標の設定
- **実績システム**：成果の可視化とポイント獲得
- **振り返り機能**：学習プロセスの内省サポート


## 🚀 開発クイックスタート

セットアップ手順は [DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md) を参照してください。

## 🐳 Docker環境

### 開発環境
```bash
# 起動
docker-compose -f docker-compose.dev.yml up --build

# バックグラウンド実行
docker-compose -f docker-compose.dev.yml up -d --build

# 停止
docker-compose -f docker-compose.dev.yml down

# ログ確認
docker-compose -f docker-compose.dev.yml logs -f [backend|frontend|nginx]
```

### 本番環境
```bash
# 起動
docker-compose up --build -d

# 停止
docker-compose down
```

## 📚 プロジェクト構造

```
learning-assistant/
├── backend/               # FastAPI バックエンド
│   ├── main.py           # API サーバー
│   ├── module/           # LLM API モジュール
│   ├── prompt/           # プロンプトテンプレート
│   └── requirements.txt  # Python依存関係
├── react-app/            # React フロントエンド
│   ├── src/
│   │   ├── components/   # UIコンポーネント
│   │   ├── pages/       # ページコンポーネント
│   │   ├── services/    # APIクライアント
│   │   └── styles/      # スタイルシート
│   └── package.json     # Node.js依存関係
├── nginx/               # Nginx設定
│   ├── nginx.conf      # リバースプロキシ設定
│   └── certs/          # SSL証明書（中身は各自）
├── docker-compose.yml        # 本番用Docker設定
├── docker-compose.dev.yml    # 開発用Docker設定
└── DEVELOPMENT_SETUP.md      # 開発用セットアップ
```

## 🤝 コントリビューション

**探Qメイトはコミュニティによって発展するプロジェクトです！**

バグ報告、機能提案、コードの貢献など、あらゆる形の参加を歓迎します。
詳細は [CONTRIBUTING.md](CONTRIBUTING.md) をご覧ください。

### 開発参加の流れ

1. このリポジトリをフォークします
2. 機能ブランチを作成します (`git checkout -b feature/amazing-feature`)
3. 変更をコミットします (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュします (`git push origin feature/amazing-feature`)
5. プルリクエストを作成します

## 🛠️ 技術スタック

### Frontend
- **React 18** + **TypeScript**
- **Vite** - 高速開発環境
- **Material-UI v5** - UIコンポーネントライブラリ
- **Zustand** - 状態管理
- **React Router v6** - ルーティング
- **React Markdown** - Markdownレンダリング

### Backend
- **FastAPI** - 高性能 Python Web フレームワーク
- **Uvicorn** - ASGIサーバー
- **Supabase** - BaaS (PostgreSQL)
- **OpenAI API** - AI対話機能
- **Pydantic** - データバリデーション

### DevOps & Infrastructure
- **Docker & Docker Compose** - コンテナ化
- **Nginx** - リバースプロキシ
- **mkcert** - ローカルSSL証明書
- **GitHub Actions** - CI/CD


## 🙏 謝辞

このプロジェクトは、多くの優れたオープンソースソフトウェアのおかげで成り立っています。

- [React](https://reactjs.org/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [OpenAI](https://openai.com/)
- [Material-UI](https://mui.com/)
- [Supabase](https://supabase.com/)
- [Docker](https://www.docker.com/)
- [Vite](https://vitejs.dev/)

## 📞 サポート

- **Issues**: [GitHub Issues](https://github.com/your-username/learning-assistant/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/learning-assistant/discussions)
- **Email**: koutakado9@gmail.com

---

<div align="center">
  Made with ❤️ by the TanQMates Community
</div>