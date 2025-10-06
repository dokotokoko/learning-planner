# 探Qメイト AI対話エージェント機能 実装要件定義書

## 📋 プロジェクト概要
**目的**: 既存の探Qメイト（learning-assistant）に、可変出力型の対話エージェント機能を統合し、学習者の"停滞"を"前進"に変える高度な伴走体験を提供する。

### 現在のシステム構成
- **フロントエンド**: React + TypeScript（Vite）
- **バックエンド**: FastAPI（Python）  
- **データベース**: Supabase（PostgreSQL）
- **LLM統合**: OpenAI API wrapper（module/llm_api.py）
- **既存機能**: プロジェクト管理、メモ機能、クエストシステム、チャット履歴

### 成功指標（KPI）
- **Momentum-Δ**: 前進感の自己評価（1–5）の前後差
- **行動実行率**: 提案後72h以内の実行割合 > 40%
- **会話継続率**: 次ターンへの遷移率 > 70%
- **満足度（CSAT）**: > 4.0/5.0

## 🎯 体験原則
1. **可変出力**: 毎ターン最適な発話アクトを1–2個だけ返す（固定フォーマット化しない）
2. **Socratic優先**: Clarify/Reflect/Probe を基本。Act（行動提案）は必要時のみ
3. **外界接触バイアス**: 読む/考えるだけで終わらせず、観察・会話・試作へ
4. **軽量・透明**: 理由（1–2行）を添え、納得感で行動率を上げる

## 🏗️ アーキテクチャ設計

### ディレクトリ構成
```
backend/
  conversation_agent/              # 新規追加モジュール
    __init__.py
    schema.py                      # Pydanticモデル定義
    state_extractor.py             # 会話から状態抽出
    support_typer.py               # 支援タイプ判定
    lens_crafter.py                # 思考レンズ生成・選択
    act_selector.py                # 発話アクト選択
    orchestrator.py                # 統合制御
    policies.py                    # 選択ポリシー
    safety.py                      # セーフティフィルタ
  main.py                          # 既存APIの拡張
  module/
    llm_api.py                     # 既存LLMクライアント活用
```

### データベース拡張（Supabase）
```sql
-- 既存テーブルに追加
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS state_snapshot JSONB;
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS support_decision JSONB;

-- 新規テーブル
CREATE TABLE conversation_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id INTEGER REFERENCES users(id),
  conversation_id UUID REFERENCES chat_conversations(id),
  turn_index INTEGER,
  state_snapshot JSONB NOT NULL,
  support_type TEXT,
  selected_acts TEXT[],
  selected_lens JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE lens_usage_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lens_name TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id),
  success_count INTEGER DEFAULT 0,
  trial_count INTEGER DEFAULT 0,
  avg_momentum_delta FLOAT,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 📦 コアデータモデル

```python
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime

class Affect(BaseModel):
    interest: int = 0
    anxiety: int = 0
    excitement: int = 0

class ProgressSignal(BaseModel):
    actions_in_last_7_days: int = 0
    novelty_ratio: float = 0.0
    looping_signals: List[str] = []
    scope_breadth: int = 1

class StateSnapshot(BaseModel):
    goal: str = ""
    time_horizon: str = ""
    last_action: str = ""
    blockers: List[str] = []
    uncertainties: List[str] = []
    options_considered: List[str] = []
    resources: List[str] = []
    affect: Affect
    progress_signal: ProgressSignal
    project_context: Optional[Dict] = None  # 既存プロジェクト情報連携

class TurnDecision(BaseModel):
    support_type: str
    selected_acts: List[str]
    selected_lens: Dict[str, str]
    reason_brief: str

class TurnPackage(BaseModel):
    natural_reply: str
    followups: List[str]
    metadata: Optional[Dict] = None
```

## 🔄 処理フロー

### 既存の`/chat`エンドポイント拡張
```python
@app.post("/chat", response_model=ChatResponse)
async def chat_with_ai_enhanced(
    chat_data: ChatMessage,
    current_user: int = Depends(get_current_user_cached)
):
    # 1. 既存処理（プロジェクト情報取得、履歴取得）
    # 2. StateSnapshot抽出（新規）
    # 3. 支援タイプ判定（新規）
    # 4. レンズ生成・選択（新規）
    # 5. 発話アクト選択（新規）
    # 6. 自然文生成
    # 7. 既存のDB保存処理に統合
```

## 🚀 実装計画（3フェーズ）

### Phase 1: コア機能実装（Week 1）
- [ ] StateSnapshot抽出エンジン実装
- [ ] 支援タイプ判定システム（6種類）
- [ ] 基本的なポリシーベースのアクト選択
- [ ] 既存APIとの統合テスト
- [ ] **テスト**: モックLLMでの動作確認

### Phase 2: 高度な対話機能（Week 2）
- [ ] レンズシステム実装
  - 動的レンズ生成（LLM活用）
  - 固定レンズとのハイブリッド評価
- [ ] 8種類の発話アクト実装
- [ ] 自然文統合エンジン
- [ ] **テスト**: 実LLMでの品質評価

### Phase 3: 学習と最適化（Week 3）
- [ ] レンズ効果の統計収集
- [ ] 成功パターンの自動学習
- [ ] React側UI改善
- [ ] リアルタイム状態表示
- [ ] **テスト**: ユーザー受け入れテスト

## 🧪 テスト戦略

### Phase 1テスト項目
```python
# tests/test_phase1.py
def test_state_extraction():
    """会話から正しくStateSnapshotを抽出できるか"""
    pass

def test_support_type_selection():
    """状況に応じた適切な支援タイプを選択できるか"""
    pass

def test_api_compatibility():
    """既存APIとの後方互換性が保たれているか"""
    pass
```

### Phase 2テスト項目
```python
# tests/test_phase2.py
def test_lens_generation():
    """状況に応じた適切なレンズを生成できるか"""
    pass

def test_act_variety():
    """同じ入力でも履歴により異なるアクトを選択するか"""
    pass

def test_natural_response():
    """固定フォーマットではない自然な応答を生成できるか"""
    pass
```

### Phase 3テスト項目
```python
# tests/test_phase3.py
def test_learning_loop():
    """使用統計が次回のレンズ選択に反映されるか"""
    pass

def test_momentum_tracking():
    """前進感の変化を正しく測定できるか"""
    pass
```

## 🔧 技術的考慮事項

### パフォーマンス最適化
- 既存のキャッシュ機構（auth_cache）を活用
- GZip圧縮ミドルウェアの継続利用
- 非同期処理によるレスポンス高速化

### 既存システムとの統合
- プロジェクト情報の自動取得・連携
- chat_logsテーブルの拡張でコンテキスト保存
- 後方互換性を保ちながら段階的機能追加

### セキュリティ
- 未成年配慮のセーフティフィルタ
- 個人情報誘導の抑制
- 既存の認証機構をそのまま活用

## 📊 モニタリング指標

```python
# metrics/tracking.py
class ConversationMetrics:
    momentum_delta: float       # 前進感の変化
    action_taken: bool          # 72h以内の行動実行
    turns_count: int            # 会話継続ターン数
    satisfaction_score: float   # ユーザー満足度
    lens_effectiveness: Dict    # レンズ別効果測定
```

## 🎯 受け入れ基準（MVP）
- ✅ 同じ入力でも履歴やaffectで選ばれるアクトが変化する
- ✅ ループ兆候→Reframe/Probe、実行意欲↑→Act への滑らかな遷移
- ✅ 固定フォーマットに偏らず、自然対話の手触りを維持
- ✅ 行動実行率・Momentum-Δ が現行ベースライン以上
- ✅ Safety Gate が未成年配慮/個人情報誘導を抑制

## 次のステップ
1. コア機能の実装開始（state_extractor.pyから）
2. モックLLMでの基本フロー確認
3. 既存APIとの統合テスト実施