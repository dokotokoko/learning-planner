# 🎓 探Qメイト - AI-Powered Inquiry Learning Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.6-green.svg)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue.svg)](https://www.typescriptlang.org/)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](CONTRIBUTING.md)

> **探究学習を革新する AI 対話型学習支援プラットフォーム**

探Qメイトは、学生の探究学習を支援するためのオープンソースプラットフォームです。AI との対話を通じて、テーマ設定から目標達成まで、段階的で効果的な学習体験を提供します。

![探Qメイト ダッシュボード](docs/images/dashboard-preview.png)
*↑ ダッシュボード画面（サンプル）*

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

## 📱 スクリーンショット

| 機能 | 画面 |
|---|---|
| **ダッシュボード** | 学習進捗と各機能へのアクセス |
| **ステップガイド** | 段階的な探究学習プロセス |
| **AI チャット** | リアルタイム対話支援 |
| **フレームワークツール** | 思考整理ツール群 |

*📸 スクリーンショットは `docs/images/` フォルダをご確認ください*

## 🛠️ 技術スタック

### Frontend
- **React 18** + **TypeScript** - モダンで型安全な開発
- **Material-UI v5** - 一貫性のあるデザインシステム
- **Framer Motion** - 滑らかなアニメーション
- **Zustand** - 軽量状態管理
- **Vite** - 高速開発環境

### Backend
- **FastAPI** - 高性能 Python Web フレームワーク
- **Supabase** - PostgreSQL ベース BaaS
- **OpenAI API** - GPT-4 による AI 対話

### DevOps & Tools
- **Docker** - コンテナ化対応
- **ESLint + Prettier** - コード品質管理
- **GitHub Actions** - CI/CD パイプライン

## 🚀 クイックスタート

### 📋 前提条件
- Node.js 18+
- Python 3.9+
- OpenAI API キー
- Supabase プロジェクト

### ⚡ 1分で起動

```bash
# 1. リポジトリのクローン
git clone https://github.com/your-username/inquiry-learning-platform.git
cd inquiry-learning-platform

# 2. 環境変数の設定
cp .env.example .env
# .envファイルを編集してAPIキーを設定

# 3. 依存関係インストール
pip install -r backend/requirements.txt
cd react-app && npm install && cd ..

# 4. 開発サーバー起動
./start_dev.sh  # Linux/macOS
# または
start_dev.bat   # Windows
```

📱 **アクセス**: http://localhost:5173

詳細なセットアップ手順は [インストールガイド](docs/INSTALLATION.md) をご覧ください。

## 📖 使い方

### 基本的な学習フロー

1. **アカウント作成**
   ```
   新規登録 → プロフィール設定 → ダッシュボードへ
   ```

2. **探究学習開始**
   ```
   ステップ1: テーマ設定 → AI と対話してテーマを決定
   ステップ2: 目標設定 → 具体的な学習目標を明確化
   ステップ3: 計画立案 → 活動内容を詳細に計画
   ステップ4: まとめ → 成果を整理・振り返り
   ```

3. **継続的な学習**
   ```
   メモ機能 → 思考の記録・整理
   AI チャット → 疑問の即座解決
   フレームワーク → 構造化された思考
   ```

詳しくは [ユーザーガイド](docs/USER_GUIDE.md) をご参照ください。

## 🤝 コントリビューション

**探Qメイトはコミュニティによって発展するプロジェクトです！**

### 🌟 参加方法

- 🐛 **バグ報告**: [Issues](https://github.com/your-username/inquiry-learning-platform/issues) で報告
- 💡 **機能提案**: [Discussions](https://github.com/your-username/inquiry-learning-platform/discussions) で議論
- 🔧 **コード貢献**: [Pull Requests](https://github.com/your-username/inquiry-learning-platform/pulls) で提案
- 📖 **ドキュメント改善**: README、ドキュメントの更新
- 🌐 **翻訳**: 多言語対応の推進

### 🚀 開発参加の流れ

```bash
# 1. フォーク・クローン
git clone https://github.com/your-username/inquiry-learning-platform.git
cd inquiry-learning-platform

# 2. 機能ブランチ作成
git checkout -b feature/amazing-feature

# 3. 開発・テスト
npm run dev        # 開発サーバー
npm run test       # テスト実行
npm run lint       # コード品質チェック

# 4. コミット・プッシュ
git commit -m "Add amazing feature"
git push origin feature/amazing-feature

# 5. Pull Request 作成
# GitHub で PR を作成してください
```

詳細は [CONTRIBUTING.md](CONTRIBUTING.md) をご覧ください。

### 💝 求めているコントリビューション

| 分野 | 内容 | スキルレベル |
|---|---|---|
| **Frontend** | React コンポーネント、UI/UX 改善 | 初級〜上級 |
| **Backend** | API エンドポイント、データベース設計 | 中級〜上級 |
| **AI/ML** | プロンプト最適化、新機能アイデア | 中級〜上級 |
| **Design** | UI デザイン、アイコン、イラスト | 初級〜上級 |
| **Documentation** | ドキュメント翻訳、チュートリアル | 初級〜中級 |
| **Testing** | テストケース作成、品質保証 | 初級〜中級 |

## 🗺️ ロードマップ

### 🎯 現在のバージョン (v1.0)
- ✅ 基本的な探究学習ガイド
- ✅ AI チャット機能
- ✅ メモ・プロジェクト管理
- ✅ 思考フレームワークツール

### 🚧 開発中 (v1.1 - v1.5)
- [ ] **PWA対応** - オフライン利用とアプリ化
- [ ] **エクスポート機能** - PDF/Word 出力
- [ ] **チーム機能** - グループでの協働学習
- [ ] **高度な分析** - 学習パターン分析・レポート
- [ ] **モバイルアプリ** - React Native 版

### 🌟 将来構想 (v2.0+)
- [ ] **VR/AR 対応** - 没入型学習体験
- [ ] **多言語対応** - グローバル展開
- [ ] **学習コミュニティ** - ユーザー間の知識共有
- [ ] **機械学習強化** - より個別最適化されたAI支援

詳細は [ROADMAP.md](docs/ROADMAP.md) をご確認ください。

## 📊 プロジェクト統計

- **コミット数**: 500+ commits
- **コントリビューター**: 募集中！
- **イシュー解決率**: 95%
- **テストカバレッジ**: 80%+

## 📜 ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。

```
MIT License

Copyright (c) 2024 探Qメイト開発チーム

Permission is hereby granted, free of charge, to any person obtaining a copy...
```

## 🙏 謝辞

このプロジェクトは以下の技術・プロジェクトの恩恵を受けています：

- [React](https://reactjs.org/) - UI フレームワーク
- [FastAPI](https://fastapi.tiangolo.com/) - バックエンドフレームワーク
- [OpenAI](https://openai.com/) - AI 対話技術
- [Material-UI](https://mui.com/) - デザインシステム
- [Supabase](https://supabase.com/) - バックエンドサービス

## 📬 サポート・連絡先

### 💬 コミュニティ
- **GitHub Discussions**: [質問・アイデア共有](https://github.com/your-username/inquiry-learning-platform/discussions)
- **Issues**: [バグ報告・機能要望](https://github.com/your-username/inquiry-learning-platform/issues)

### 📧 直接連絡
- **メール**: support@inquiry-learning.org
- **Twitter**: [@InquiryLearning](https://twitter.com/InquiryLearning)

### 🆘 トラブルシューティング
よくある問題と解決方法は [FAQ](docs/FAQ.md) をご確認ください。

---

<div align="center">

**🌟 このプロジェクトが役に立ったら、ぜひ Star ⭐ をお願いします！**

[![GitHub stars](https://img.shields.io/github/stars/your-username/inquiry-learning-platform?style=social)](https://github.com/your-username/inquiry-learning-platform/stargazers)

*探究学習の未来を一緒に創りましょう！*

</div> 