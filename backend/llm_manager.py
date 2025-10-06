"""
LLMプール管理システム
複数のLLMクライアントをプールで管理し、高性能な並列処理を実現
"""
import os
import asyncio
import time
import logging
from typing import Optional, Dict, Any, Union, List
from dataclasses import dataclass, field
from datetime import datetime, timezone
from module.llm_api import learning_plannner

logger = logging.getLogger(__name__)


@dataclass
class LLMSystemMetrics:
    """LLMシステムのメトリクス情報"""
    total_requests: int = 0
    pool_requests: int = 0
    legacy_requests: int = 0
    avg_response_time: float = 0.0
    pool_avg_response_time: float = 0.0
    legacy_avg_response_time: float = 0.0
    error_count: int = 0
    pool_error_count: int = 0
    legacy_error_count: int = 0
    last_error_time: Optional[float] = None
    system_start_time: float = field(default_factory=time.time)


class LLMManager:
    """
    LLMプールマネージャー
    複数のLLMクライアントを効率的に管理し、スケーラブルな処理を実現
    """
    
    def __init__(self):
        # 設定値（デフォルトでプール機能を有効化）
        self.pool_enabled = True  # プール機能をデフォルトで有効
        self.pool_size = int(os.environ.get("LLM_POOL_SIZE", "10"))  # デフォルトを10クライアント
        self.pool_timeout = float(os.environ.get("LLM_POOL_TIMEOUT", "30.0"))
        
        # フォールバック設定
        self.auto_fallback = os.environ.get("LLM_AUTO_FALLBACK", "true").lower() == "true"
        self.fallback_threshold = int(os.environ.get("LLM_FALLBACK_ERROR_THRESHOLD", "3"))
        
        # デバッグ・監視設定
        self.debug_mode = os.environ.get("LLM_POOL_DEBUG", "false").lower() == "true"
        self.metrics_enabled = os.environ.get("LLM_METRICS_ENABLED", "true").lower() == "true"
        
        # システム状態
        self._initialized = False
        self._pool_healthy = True
        self._consecutive_pool_errors = 0
        
        # 既存のレガシークライアント（必須・常に利用可能）
        self.legacy_client: Optional[learning_plannner] = None
        
        # プール関連（オプション）
        self._pool_clients: List[learning_plannner] = []
        self._pool_semaphore: Optional[asyncio.Semaphore] = None
        self._current_pool_index = 0
        
        # メトリクス
        self.metrics = LLMSystemMetrics()
        
        logger.info(f"🔧 LLMManager初期化")
        logger.info(f"   プール有効: {self.pool_enabled}")
        logger.info(f"   プールサイズ: {self.pool_size}")
        logger.info(f"   自動フォールバック: {self.auto_fallback}")
    
    async def initialize(self, existing_legacy_client: Optional[learning_plannner] = None):
        """
        システムを初期化（既存のlegacy_clientがある場合はそれを使用）
        
        Args:
            existing_legacy_client: 既存のレガシークライアント（main.pyから渡される）
        """
        if self._initialized:
            logger.info("✅ LLMManager は既に初期化済みです")
            return
        
        try:
            # レガシークライアントの設定（既存のものを使用、または新規作成）
            if existing_legacy_client:
                self.legacy_client = existing_legacy_client
                logger.info("✅ 既存のlegacy_clientを使用")
            else:
                self.legacy_client = learning_plannner()
                logger.info("✅ 新しいlegacy_clientを作成")
            
            # プール機能の初期化（オプション）
            if self.pool_enabled:
                await self._initialize_pool()
            else:
                logger.info("ℹ️ プール機能は無効です（従来システムのみ使用）")
            
            self._initialized = True
            logger.info("🎉 LLMManager初期化完了")
            
        except Exception as e:
            logger.error(f"❌ LLMManager初期化エラー: {e}")
            # 初期化エラー時でもlegacy_clientが利用可能なら継続
            if self.legacy_client is not None:
                logger.info("⚠️ プール初期化に失敗しましたが、legacy_clientで継続")
                self._initialized = True
                self.pool_enabled = False
            else:
                raise
    
    async def _initialize_pool(self):
        """プール機能の初期化"""
        try:
            logger.info(f"🏊 プール初期化開始 (サイズ: {self.pool_size})")
            
            # セマフォ初期化
            self._pool_semaphore = asyncio.Semaphore(self.pool_size)
            
            # プールクライアント作成
            for i in range(self.pool_size):
                try:
                    client = learning_plannner()
                    self._pool_clients.append(client)
                    logger.debug(f"   プールクライアント {i+1}/{self.pool_size} 作成完了")
                except Exception as e:
                    logger.warning(f"   プールクライアント {i+1} 作成失敗: {e}")
                    # 一部失敗してもプール全体は利用可能
            
            if len(self._pool_clients) == 0:
                logger.warning("⚠️ プールクライアントを1つも作成できませんでした")
                self.pool_enabled = False
            else:
                logger.info(f"✅ プール初期化完了 ({len(self._pool_clients)}/{self.pool_size}個のクライアント)")
                
        except Exception as e:
            logger.error(f"❌ プール初期化エラー: {e}")
            self.pool_enabled = False
            raise
    
    def should_use_pool(self) -> bool:
        """
        プールを使用すべきかを判定
        
        Returns:
            プールを使用する場合True、レガシーを使用する場合False
        """
        if not self.pool_enabled:
            return False
        
        if not self._pool_healthy:
            if self.debug_mode:
                logger.debug("🔄 プールが不健全なためlegacy_clientを使用")
            return False
        
        if len(self._pool_clients) == 0:
            return False
        
        return True
    
    async def generate_response(
        self, 
        messages: List[Dict[str, str]], 
        prefer_pool: bool = True
    ) -> str:
        """
        既存のgenerate_responseと完全互換のインターフェース
        
        Args:
            messages: メッセージ履歴
            prefer_pool: プール使用を優先するか（デフォルト: True）
            
        Returns:
            LLMからの応答文字列
        """
        start_time = time.time()
        
        try:
            # メトリクス更新
            self.metrics.total_requests += 1
            
            # 使用システムの決定
            use_pool = prefer_pool and self.should_use_pool()
            
            if use_pool:
                # プールシステムを使用
                response = await self._generate_with_pool(messages)
                self.metrics.pool_requests += 1
                
                # プール成功時の処理
                self._consecutive_pool_errors = 0
                self._pool_healthy = True
                
                if self.debug_mode:
                    logger.debug(f"✅ プールでの処理完了: {time.time() - start_time:.2f}秒")
                
                return response
            
            else:
                # レガシーシステムを使用
                response = await self._generate_with_legacy(messages)
                self.metrics.legacy_requests += 1
                
                if self.debug_mode:
                    logger.debug(f"✅ レガシーでの処理完了: {time.time() - start_time:.2f}秒")
                
                return response
                
        except Exception as e:
            # エラー処理とメトリクス更新
            self.metrics.error_count += 1
            self.metrics.last_error_time = time.time()
            
            logger.error(f"❌ LLM応答生成エラー: {e}")
            
            # プールエラーの場合、フォールバック処理
            if use_pool and self.auto_fallback:
                logger.info("🔄 プールエラー、レガシーシステムにフォールバック")
                self._consecutive_pool_errors += 1
                self.metrics.pool_error_count += 1
                
                # エラーが多い場合はプールを一時的に無効化
                if self._consecutive_pool_errors >= self.fallback_threshold:
                    logger.warning(f"⚠️ プールエラーが{self.fallback_threshold}回連続、一時的に無効化")
                    self._pool_healthy = False
                
                try:
                    response = await self._generate_with_legacy(messages)
                    self.metrics.legacy_requests += 1
                    return response
                except Exception as fallback_error:
                    logger.error(f"❌ フォールバックも失敗: {fallback_error}")
                    self.metrics.legacy_error_count += 1
                    raise
            else:
                if not use_pool:
                    self.metrics.legacy_error_count += 1
                raise
        
        finally:
            # 応答時間の更新
            response_time = time.time() - start_time
            if self.metrics.total_requests == 1:
                self.metrics.avg_response_time = response_time
            else:
                # 移動平均
                alpha = 0.1  # 重み
                self.metrics.avg_response_time = (alpha * response_time + 
                                                 (1 - alpha) * self.metrics.avg_response_time)
    
    async def _generate_with_pool(self, messages: List[Dict[str, str]]) -> str:
        """プールシステムでの応答生成"""
        if not self._pool_semaphore or len(self._pool_clients) == 0:
            raise Exception("プールが初期化されていません")
        
        # セマフォで同時実行数を制御
        async with self._pool_semaphore:
            # ラウンドロビンでクライアントを選択
            client_index = self._current_pool_index % len(self._pool_clients)
            self._current_pool_index += 1
            
            client = self._pool_clients[client_index]
            
            # 非同期実行
            response = await asyncio.wait_for(
                asyncio.to_thread(client.generate_response, messages),
                timeout=self.pool_timeout
            )
            
            return response
    
    async def _generate_with_legacy(self, messages: List[Dict[str, str]]) -> str:
        """レガシーシステムでの応答生成（既存と完全同一）"""
        if self.legacy_client is None:
            raise Exception("legacy_clientが初期化されていません")
        
        # 既存のコードと完全に同じ処理
        return await asyncio.to_thread(
            self.legacy_client.generate_response,
            messages
        )
    
    def get_metrics(self) -> Dict[str, Any]:
        """メトリクス情報を取得"""
        uptime = time.time() - self.metrics.system_start_time
        
        return {
            "system_info": {
                "initialized": self._initialized,
                "pool_enabled": self.pool_enabled,
                "pool_healthy": self._pool_healthy,
                "pool_size": len(self._pool_clients),
                "legacy_available": self.legacy_client is not None,
                "uptime_seconds": uptime
            },
            "request_stats": {
                "total_requests": self.metrics.total_requests,
                "pool_requests": self.metrics.pool_requests,
                "legacy_requests": self.metrics.legacy_requests,
                "pool_usage_rate": (self.metrics.pool_requests / max(self.metrics.total_requests, 1))
            },
            "performance": {
                "avg_response_time": self.metrics.avg_response_time,
                "requests_per_second": self.metrics.total_requests / max(uptime, 1)
            },
            "errors": {
                "total_errors": self.metrics.error_count,
                "pool_errors": self.metrics.pool_error_count,
                "legacy_errors": self.metrics.legacy_error_count,
                "error_rate": self.metrics.error_count / max(self.metrics.total_requests, 1),
                "consecutive_pool_errors": self._consecutive_pool_errors
            },
            "configuration": {
                "pool_size": self.pool_size,
                "pool_timeout": self.pool_timeout,
                "auto_fallback": self.auto_fallback,
                "fallback_threshold": self.fallback_threshold,
                "debug_mode": self.debug_mode
            }
        }
    
    def health_check(self) -> Dict[str, Any]:
        """システムの健全性チェック"""
        issues = []
        
        if not self._initialized:
            issues.append("システムが初期化されていません")
        
        if self.legacy_client is None:
            issues.append("legacy_clientが利用不可")
        
        if self.pool_enabled and len(self._pool_clients) == 0:
            issues.append("プールが有効だがクライアントが0個")
        
        if self._consecutive_pool_errors >= self.fallback_threshold:
            issues.append(f"プールエラーが{self._consecutive_pool_errors}回連続")
        
        error_rate = self.metrics.error_count / max(self.metrics.total_requests, 1)
        if error_rate > 0.1:  # 10%以上
            issues.append(f"エラー率が高い: {error_rate:.1%}")
        
        return {
            "status": "healthy" if not issues else "warning",
            "issues": issues,
            "last_check": datetime.now(timezone.utc).isoformat()
        }


# グローバルインスタンス
_llm_manager: Optional[LLMManager] = None


async def get_llm_manager() -> LLMManager:
    """LLMManagerのグローバルインスタンスを取得"""
    global _llm_manager
    
    if _llm_manager is None:
        _llm_manager = LLMManager()
    
    return _llm_manager


# 既存のAPIとの完全互換ラッパー関数
async def safe_generate_response(
    legacy_client: Optional[learning_plannner],
    messages: List[Dict[str, str]]
) -> str:
    """
    既存のコードからの移行を簡単にする互換関数
    
    Args:
        legacy_client: 既存のlegacy_client（main.pyのllm_client）
        messages: メッセージ履歴
        
    Returns:
        LLMからの応答
        
    Usage:
        # 既存コードの置き換え例:
        # response = llm_client.generate_response(messages)
        # ↓
        # response = await safe_generate_response(llm_client, messages)
    """
    manager = await get_llm_manager()
    
    # 初回の場合、既存のlegacy_clientを使用して初期化
    if not manager._initialized:
        await manager.initialize(legacy_client)
    
    return await manager.generate_response(messages)


# デバッグ・監視用のユーティリティ関数
def log_system_status():
    """システム状態をログに出力"""
    if _llm_manager:
        metrics = _llm_manager.get_metrics()
        health = _llm_manager.health_check()
        
        logger.info("📊 LLMManager 状態レポート:")
        logger.info(f"   総リクエスト: {metrics['request_stats']['total_requests']}")
        logger.info(f"   プール使用率: {metrics['request_stats']['pool_usage_rate']:.1%}")
        logger.info(f"   平均応答時間: {metrics['performance']['avg_response_time']:.2f}秒")
        logger.info(f"   エラー率: {metrics['errors']['error_rate']:.1%}")
        logger.info(f"   システム状態: {health['status']}")
        
        if health['issues']:
            logger.warning(f"   課題: {', '.join(health['issues'])}")


# 環境変数設定例のドキュメント
ENV_EXAMPLES = """
# Phase 1 環境変数設定例

# === 基本設定 ===
ENABLE_LLM_POOL=true          # プール機能有効化（デフォルト: false）
LLM_POOL_SIZE=5               # プールサイズ（デフォルト: 5）
LLM_POOL_TIMEOUT=30.0         # プールタイムアウト秒（デフォルト: 30.0）

# === フォールバック設定 ===
LLM_AUTO_FALLBACK=true        # 自動フォールバック（デフォルト: true）
LLM_FALLBACK_ERROR_THRESHOLD=3 # フォールバック閾値（デフォルト: 3）

# === 監視・デバッグ ===
LLM_POOL_DEBUG=false          # デバッグモード（デフォルト: false）
LLM_METRICS_ENABLED=true      # メトリクス有効化（デフォルト: true）

# === 段階的導入設定 ===
# 本番環境での段階的導入例:
# Week 1: ENABLE_LLM_POOL=false (既存システムのみ)
# Week 2: ENABLE_LLM_POOL=true, LLM_POOL_SIZE=3 (小規模テスト)
# Week 3: LLM_POOL_SIZE=5 (通常運用)
# Week 4: LLM_POOL_SIZE=8 (高負荷対応)
"""