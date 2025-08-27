# 探Qメイト AI対話エージェント機能

## 📋 Phase 1 実装完了

可変出力型の対話エージェント機能をlearning-assistantに統合しました。

### ✅ 実装済み機能

1. **状態抽出エンジン** (`state_extractor.py`)
   - 会話履歴から学習状態を自動抽出
   - LLMベース + ヒューリスティックフォールバック

2. **支援タイプ判定** (`support_typer.py`)
   - 6種類の支援タイプを自動判定
   - 理解深化/道筋提示/視点転換/行動活性化/絞り込み/意思決定

3. **発話アクト選択** (`policies.py`)
   - 8種類のアクトから最適な組み合わせを選択
   - Socratic優先のポリシー実装

4. **統合制御** (`orchestrator.py`)
   - 全コンポーネントを統合して1ターンの対話を制御
   - モックモードでの安全な動作

5. **API統合** (`main.py`)
   - 既存の`/chat`エンドポイントに統合
   - 環境変数でのON/OFF制御
   - 後方互換性を完全保持

### 🚀 有効化手順

1. **データベース拡張**
   ```bash
   # SupabaseのSQL Editorで実行
   cat schema/conversation_agent_phase1.sql
   ```

2. **環境変数設定**
   ```bash
   export ENABLE_CONVERSATION_AGENT=true
   ```

3. **アプリケーション再起動**
   ```bash
   cd backend
   python main.py
   ```

### 🧪 テスト実行

```bash
cd backend
python -m pytest tests/test_phase1.py -v
```

### 📊 動作確認

対話エージェント機能が有効な場合、以下のログが出力されます：

```
INFO - 対話エージェント機能が利用可能です
INFO - ✅ 対話エージェント初期化完了（モックモード）
INFO - ✅ 対話エージェント処理完了: 視点転換 | ['Reframe', 'Probe']
```

### 🎯 Phase 1の特徴

- **モックモード**: LLMを使わずルールベースで動作
- **フォールバック**: エラー時は従来の処理に自動切替
- **非破壊的**: 既存機能への影響なし
- **段階的**: 機能フラグで安全に有効化

### 📁 ファイル構成

```
backend/conversation_agent/
├── __init__.py              # モジュール初期化
├── schema.py                # データモデル定義
├── state_extractor.py       # 状態抽出エンジン
├── support_typer.py         # 支援タイプ判定
├── policies.py              # アクト選択ポリシー
├── orchestrator.py          # 統合制御
└── README.md               # このファイル

backend/tests/
└── test_phase1.py          # Phase 1テストスイート

schema/
└── conversation_agent_phase1.sql  # DB拡張スクリプト
```

### 🔧 環境変数

| 変数名 | デフォルト | 説明 |
|--------|------------|------|
| `ENABLE_CONVERSATION_AGENT` | `false` | 対話エージェント機能の有効化 |

### 📈 次のステップ（Phase 2）

1. **LLM統合**: 実際のLLMを使用した高度な処理
2. **レンズシステム**: 動的な思考レンズ生成・選択
3. **学習機能**: 使用統計に基づく自動改善
4. **UI改善**: React側のリアルタイム表示

### 🐛 トラブルシューティング

**Q: 対話エージェント機能が動作しない**
```bash
# ログを確認
grep "対話エージェント" logs/app.log

# 環境変数を確認
echo $ENABLE_CONVERSATION_AGENT

# モジュールインポートを確認
python -c "from conversation_agent import ConversationOrchestrator; print('OK')"
```

**Q: テストが失敗する**
```bash
# 依存関係を確認
pip install -r requirements.txt

# 単体テストを実行
python -m unittest tests.test_phase1.TestStateExtractor -v
```

### 📝 サンプル応答

**従来の応答:**
```
こんにちは！どのようなことでお手伝いできますか？
```

**対話エージェント応答（モックモード）:**
```
もう少し詳しく教えていただけますか？どのような点で困っていますか？

**次にできること:**
• 具体例を教えてください  
• 他の方法も検討しましょう
• まずは小さく始めてみます
```

### 🎉 Phase 1 完了！

現在のlearning-assistantに対話エージェント機能が正常に統合されました。既存の機能を壊すことなく、新しい体験を段階的に提供できる基盤が完成しています。