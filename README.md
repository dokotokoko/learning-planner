# 🎓 探Qメイト - AI-Powered Inquiry Learning Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.6-green.svg)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue.svg)](https://www.typescriptlang.org/)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](CONTRIBUTING.md)

> **探究学習を革新する AI 対話型学習支援プラットフォーム**

探Qメイトは、学生の探究学習を支援するためのオープンソースプラットフォームです。AI との対話を通じて、テーマ設定から目標達成まで、段階的で効果的な学習体験を提供します。

## ✨ なぜ探Qメイトなのか？

### 🎯 解決する課題
- **探究学習の方向性に迷う学生**：何から始めればいいかわからない
- **個別指導の限界**：教師一人では全員を十分にサポートできない  
- **学習プロセスの可視化不足**：進捗や思考過程が見えにくい
- **継続的な振り返りの困難さ**：適切なタイミングでの内省支援が難しい

### 💡 私たちのソリューション
- **AI メンター**：24時間利用可能な対話型学習支援
- **段階的ガイド**：4つのステップで確実な学習進行
- **可視化ツール**：思考フレームワークとマインドマップ
- **継続的サポート**：スマート通知による最適な学習リズム

## 🚀 主要機能

### 🔄 探究学習の4ステップガイド
```
1. テーマ設定    →  2. 目標設定    →  3. アイディエーション  →  4. まとめ・振り返り
   興味の発見        具体的な目標      活動計画の立案         成果の整理
```

### 🤖 AI 対話機能
- **リアルタイム支援**：学習中の疑問を即座に解決
- **個別最適化**：学習者のペースと理解度に合わせた対話
- **創発的対話**：質問によって新たな発見を促進

### 📝 統合メモシステム
- **分割パネル UI**：メモとチャットを同時活用
- **Markdown 対応**：構造化された美しいノート
- **自動保存**：作業の中断を気にせず集中

### 🎮 思考フレームワークツール
- **ロジックツリー**：問題を体系的に分解
- **マインドマップ**：アイデアの視覚的整理  
- **5-Whys分析**：根本原因の深掘り
- **インパクト・実現可能性マトリックス**：アイデア評価

## 🛠️ 技術スタック

### Frontend
- **React 18** + **TypeScript**
- **Vite** - 高速開発環境
- **Material-UI v5** - UIコンポーネントライブラリ
- **Zustand** - 状態管理
- **React Router** - ルーティング
- **Framer Motion** - アニメーション

### Backend
- **FastAPI** - 高性能 Python Web フレームワーク
- **Uvicorn** - ASGIサーバー
- **Supabase** - BaaS (PostgreSQL)
- **OpenAI API** - AI対話機能

### DevOps & Tools
- **Docker** - コンテナ化
- **ESLint + Prettier** - コード品質管理
- **GitHub Actions** - CI/CD

## 🚀 クイックスタート (開発環境)

### 📋 前提条件
- **Node.js** (v18以上)
- **Python** (v3.9以上)
- **OpenAI API キー**
- **Supabase プロジェクト**

### ⚡ 起動手順

1. **リポジトリをクローン**
   ```bash
   git clone https://github.com/your-username/learning-assistant.git
   cd learning-assistant
   ```

2. **環境変数を設定**
   - `backend/` と `react-app/` の中に `.env.example` ファイルがあります。
   - これらをコピーして `.env` ファイルを作成し、APIキーやSupabaseの情報を設定してください。

3. **依存関係をインストール**
   ```bash
   # Backend
   cd backend
   pip install -r requirements.txt
   cd ..

   # Frontend
   cd react-app
   npm install
   cd ..
   ```

4. **開発サーバーを起動**
   - 以下のスクリプトを実行すると、フロントエンドとバックエンドが同時に起動します。
   ```bash
   # Windowsの場合
   start_dev.bat

   # macOS / Linuxの場合
   ./start_dev.sh
   ```
   
   - **フロントエンド**: `http://localhost:5173`
   - **バックエンド**: `http://localhost:8000`

## 🐳 Dockerでの実行

本番環境に近い形で動作させたい場合は、Dockerを利用します。

1. **DockerとDocker Composeをインストール**

2. **環境変数を設定**
   - `backend/.env` と `react-app/.env` をクイックスタートの手順に従って設定します。

3. **Dockerコンテナをビルドして起動**
   ```bash
   docker-compose up --build
   ```
   - **統合アクセス**: `http://localhost:8080` (Nginxリバースプロキシ経由)

## 🤝 コントリビューション

**探Qメイトはコミュニティによって発展するプロジェクトです！**

バグ報告、機能提案、コードの貢献など、あらゆる形の参加を歓迎します。
詳細は [CONTRIBUTING.md](CONTRIBUTING.md) をご覧ください。

### 開発参加の流れ

1. このリポジトリをフォークします。
2. 機能ブランチを作成します (`git checkout -b feature/amazing-feature`)。
3. 変更をコミットします (`git commit -m 'Add some amazing feature'`)。
4. ブランチにプッシュします (`git push origin feature/amazing-feature`)。
5. プルリクエストを作成します。

## 🗺️ ロードマップ

- [ ] **PWA対応** - オフライン利用とアプリ化
- [ ] **エクスポート機能** - PDF/Word 出力
- [ ] **チーム機能** - グループでの協働学習
- [ ] **高度な分析** - 学習パターン分析・レポート
- [ ] **モバイルアプリ対応**

## 📜 ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。

## 🙏 謝辞

このプロジェクトは、多くの優れたオープンソースソフトウェアのおかげで成り立っています。
- [React](https://reactjs.org/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [OpenAI](https://openai.com/)
- [Material-UI](https://mui.com/)
- [Supabase](https://supabase.com/)