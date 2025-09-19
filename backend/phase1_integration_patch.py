"""
Phase 1 統合パッチ - 既存main.pyへの安全な統合

このパッチは既存のmain.pyに対して最小限の変更で
プール機能を統合します。

統合原則:
1. 既存のコードは一文字も変更しない
2. 追加のみ（削除・変更なし）
3. デフォルトは既存動作を維持
4. 環境変数による段階的有効化
5. 完全なフォールバック機能
"""

# =====================================
# 1. インポート追加パッチ
# =====================================
IMPORT_PATCH = """
# Phase 1: プール機能インポート（既存インポートの後に追加）
from phase1_llm_system import (
    get_phase1_manager,
    safe_generate_response,
    log_system_status
)
"""

# =====================================
# 2. グローバル変数追加パッチ
# =====================================
GLOBAL_VARIABLES_PATCH = """
# Phase 1: プール管理システム（既存のllm_clientは完全に維持）
# llm_client = None  # ← 既存（変更なし）
phase1_llm_manager = None  # Phase 1 プール管理システム（追加）
"""

# =====================================
# 3. startup_event 拡張パッチ
# =====================================
STARTUP_EVENT_PATCH = """
        # === 既存のLLMクライアント初期化（変更なし）===
        # LLMクライアント初期化
        llm_client = learning_plannner()  # ← 既存コード（完全に維持）
        
        # === Phase 1: プール管理システム初期化（追加）===
        global phase1_llm_manager
        try:
            # Phase 1システムの初期化（既存のllm_clientを使用）
            phase1_llm_manager = await get_phase1_manager()
            await phase1_llm_manager.initialize(existing_legacy_client=llm_client)
            
            # 初期化状況をログ出力
            if os.environ.get("ENABLE_LLM_POOL", "false").lower() == "true":
                logger.info("✅ Phase 1: プール機能が有効化されました")
            else:
                logger.info("ℹ️ Phase 1: プール機能は無効です（既存システムを使用）")
                
        except Exception as e:
            logger.error(f"⚠️ Phase 1初期化エラー（既存システムで継続）: {e}")
            phase1_llm_manager = None
"""

# =====================================
# 4. chat_with_ai 拡張パッチ
# =====================================
CHAT_WITH_AI_PATCH = """
        # === Phase 1: 拡張LLM処理（既存処理を完全保持）===
        
        # Phase 1システムが利用可能かチェック
        use_phase1 = (
            phase1_llm_manager is not None and 
            phase1_llm_manager._initialized and
            os.environ.get("ENABLE_LLM_POOL", "false").lower() == "true"
        )
        
        if use_phase1:
            try:
                # Phase 1システムを使用（プール機能付き）
                response = await phase1_llm_manager.generate_response(messages)
                logger.debug("✅ Phase 1システムで処理完了")
                
            except Exception as phase1_error:
                logger.warning(f"⚠️ Phase 1システムエラー、既存システムにフォールバック: {phase1_error}")
                # フォールバック: 既存処理を実行
                response = llm_client.generate_response(messages)
                
        else:
            # 既存システムを使用（変更なし）
            response = llm_client.generate_response(messages)
"""

# =====================================
# 5. メトリクスエンドポイント追加パッチ
# =====================================
METRICS_ENDPOINT_PATCH = """
# Phase 1: メトリクス・監視エンドポイント（追加）

@app.get("/metrics/llm-system")
async def get_llm_system_metrics(
    current_user: int = Depends(get_current_user_cached)
):
    \"\"\"Phase 1 LLMシステムのメトリクス取得\"\"\"
    try:
        if phase1_llm_manager and phase1_llm_manager._initialized:
            metrics = phase1_llm_manager.get_metrics()
            health = phase1_llm_manager.health_check()
            
            return {
                "phase1_system": {
                    "metrics": metrics,
                    "health": health,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                },
                "legacy_system": {
                    "available": llm_client is not None,
                    "class": llm_client.__class__.__name__ if llm_client else None
                }
            }
        else:
            return {
                "phase1_system": {
                    "status": "not_initialized",
                    "message": "Phase 1システムが初期化されていません"
                },
                "legacy_system": {
                    "available": llm_client is not None,
                    "status": "active",
                    "message": "既存システムのみ動作中"
                }
            }
            
    except Exception as e:
        logger.error(f"メトリクス取得エラー: {e}")
        return {
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

@app.get("/debug/llm-system")
async def debug_llm_system(
    current_user: int = Depends(get_current_user_cached)
):
    \"\"\"Phase 1 LLMシステムのデバッグ情報\"\"\"
    debug_info = {
        "environment_variables": {
            "ENABLE_LLM_POOL": os.environ.get("ENABLE_LLM_POOL", "false"),
            "LLM_POOL_SIZE": os.environ.get("LLM_POOL_SIZE", "5"),
            "LLM_POOL_TIMEOUT": os.environ.get("LLM_POOL_TIMEOUT", "30.0"),
            "LLM_AUTO_FALLBACK": os.environ.get("LLM_AUTO_FALLBACK", "true"),
            "LLM_POOL_DEBUG": os.environ.get("LLM_POOL_DEBUG", "false")
        },
        "system_status": {
            "phase1_manager_exists": phase1_llm_manager is not None,
            "phase1_initialized": phase1_llm_manager._initialized if phase1_llm_manager else False,
            "legacy_client_exists": llm_client is not None,
            "current_time": datetime.now(timezone.utc).isoformat()
        }
    }
    
    # メトリクス情報を追加
    if phase1_llm_manager and phase1_llm_manager._initialized:
        debug_info["detailed_metrics"] = phase1_llm_manager.get_metrics()
        debug_info["health_check"] = phase1_llm_manager.health_check()
    
    return debug_info

@app.post("/admin/llm-system/log-status")
async def log_llm_system_status(
    current_user: int = Depends(get_current_user_cached)
):
    \"\"\"LLMシステムの状態をログに出力（管理者用）\"\"\"
    try:
        log_system_status()
        return {
            "message": "システム状態をログに出力しました",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"ログ出力エラー: {e}")
        return {
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
"""

# =====================================
# 6. 統合用の完全パッチ関数
# =====================================
def generate_integration_instructions():
    """統合手順の詳細ガイドを生成"""
    return """
    ========================================
    Phase 1 統合手順（既存コード保護）
    ========================================
    
    ⚠️ 重要: 統合前に必ずバックアップを作成してください
    
    1. バックアップ作成:
       cp backend/main.py backend/main.py.backup.phase1
    
    2. インポートセクションに追加:
       main.pyの既存インポートの最後に IMPORT_PATCH を追加
    
    3. グローバル変数セクションに追加:
       # === グローバル変数 ===
       llm_client = None  # ← 既存（変更しない）
       supabase: Client = None  # ← 既存（変更しない）
       phase1_llm_manager = None  # ← この行を追加
    
    4. startup_event関数の拡張:
       # LLMクライアント初期化（既存コードの後に）
       llm_client = learning_plannner()  # ← 既存（変更しない）
       
       # この下に STARTUP_EVENT_PATCH を追加
    
    5. chat_with_ai関数の拡張:
       既存の以下の箇所を探します：
       ```python
       else:
           # 従来の処理
           response = llm_client.generate_response(messages)
       ```
       
       この箇所を CHAT_WITH_AI_PATCH で置き換えます
       （既存の処理ロジックは完全に保持）
    
    6. エンドポイント追加:
       ファイル末尾に METRICS_ENDPOINT_PATCH を追加
    
    7. 環境変数設定（.env）:
       # Phase 1 設定（デフォルトで無効）
       ENABLE_LLM_POOL=false     # 初期は無効（安全）
       LLM_POOL_SIZE=5           # プールサイズ
       LLM_POOL_DEBUG=false      # デバッグモード
    
    ========================================
    段階的有効化手順
    ========================================
    
    Week 1: システム統合・監視開始
       ENABLE_LLM_POOL=false
       → 既存システムのみ動作、新システムは待機状態
    
    Week 2: 小規模テスト開始
       ENABLE_LLM_POOL=true
       LLM_POOL_SIZE=3
       → 小規模プール機能でテスト
    
    Week 3: 本格運用開始
       LLM_POOL_SIZE=5
       → 通常運用でパフォーマンス測定
    
    Week 4: 高負荷対応
       LLM_POOL_SIZE=8-10
       → 20人同時接続に対応
    
    ========================================
    安全機能
    ========================================
    
    1. 完全フォールバック:
       - プールエラー時は自動的に既存システムに切り替え
       - 既存システムが常に利用可能
    
    2. 段階的無効化:
       - エラーが連続3回発生で一時的にプール無効化
       - 環境変数でいつでも無効化可能
    
    3. 詳細監視:
       - GET /metrics/llm-system でメトリクス確認
       - GET /debug/llm-system でデバッグ情報確認
    
    4. 緊急時対応:
       ENABLE_LLM_POOL=false に設定してサービス再起動
       → 即座に既存システムのみに戻る
    
    ========================================
    検証方法
    ========================================
    
    1. 統合後の動作確認:
       curl "http://localhost:8000/debug/llm-system" -H "Authorization: Bearer YOUR_TOKEN"
    
    2. メトリクス確認:
       curl "http://localhost:8000/metrics/llm-system" -H "Authorization: Bearer YOUR_TOKEN"
    
    3. チャット機能テスト:
       通常のチャットエンドポイントでテスト
       → レスポンスに変化がないことを確認
    
    4. ログ確認:
       アプリケーションログで以下を確認:
       - "Phase 1: プール機能は無効です" または
       - "Phase 1: プール機能が有効化されました"
    
    ========================================
    """

def generate_env_template():
    """Phase 1用の.env設定テンプレート"""
    return """
# =====================================
# Phase 1 LLMプール機能設定
# =====================================

# === 基本設定 ===
# プール機能の有効/無効（デフォルト: false）
# true: プール機能を使用, false: 既存システムのみ使用
ENABLE_LLM_POOL=false

# プールサイズ（デフォルト: 5）
# 同時に保持するLLMクライアントの数
# 推奨値: 3-10 (大きすぎるとメモリ使用量が増加)
LLM_POOL_SIZE=5

# プール処理のタイムアウト秒（デフォルト: 30.0）
LLM_POOL_TIMEOUT=30.0

# === フォールバック設定 ===
# 自動フォールバック機能（デフォルト: true）
# true: プールエラー時に既存システムに自動切り替え
LLM_AUTO_FALLBACK=true

# フォールバック発動の閾値（デフォルト: 3）
# 連続してこの回数エラーが発生するとプールを一時無効化
LLM_FALLBACK_ERROR_THRESHOLD=3

# === 監視・デバッグ ===
# デバッグモード（デフォルト: false）
# true: 詳細ログを出力
LLM_POOL_DEBUG=false

# メトリクス収集（デフォルト: true）
LLM_METRICS_ENABLED=true

# =====================================
# 段階的導入スケジュール例
# =====================================
# 
# Phase 1-1 (統合・監視): ENABLE_LLM_POOL=false
# Phase 1-2 (小規模テスト): ENABLE_LLM_POOL=true, LLM_POOL_SIZE=3
# Phase 1-3 (通常運用): LLM_POOL_SIZE=5
# Phase 1-4 (高負荷対応): LLM_POOL_SIZE=8
#
# =====================================
"""

if __name__ == "__main__":
    print("=== Phase 1 統合ガイド ===")
    print(generate_integration_instructions())
    print("\n=== 環境変数テンプレート ===")
    print(generate_env_template())