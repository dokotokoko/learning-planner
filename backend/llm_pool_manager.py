"""
LLMクライアントプール管理システム
単一インスタンス問題を解決し、スケーラブルな処理を実現
"""

import asyncio
import threading
import time
import logging
from typing import List, Optional, Dict, Any
from queue import Queue, Empty
from contextlib import asynccontextmanager
from dataclasses import dataclass
from module.llm_api import learning_plannner
from module.async_llm_api import AsyncLearningPlanner

logger = logging.getLogger(__name__)


@dataclass
class ConnectionMetrics:
    """接続メトリクス"""
    total_requests: int = 0
    active_connections: int = 0
    queue_size: int = 0
    avg_response_time: float = 0.0
    error_count: int = 0
    last_error_time: Optional[float] = None


class LLMConnectionPool:
    """
    LLMクライアントのコネクションプール
    複数のクライアントインスタンスを管理し、並列処理を実現
    """
    
    def __init__(
        self,
        pool_size: int = 10,
        max_queue_size: int = 100,
        connection_timeout: float = 30.0,
        health_check_interval: float = 60.0
    ):
        self.pool_size = pool_size
        self.max_queue_size = max_queue_size
        self.connection_timeout = connection_timeout
        self.health_check_interval = health_check_interval
        
        # コネクションプール
        self._pool: Queue[learning_plannner] = Queue(maxsize=pool_size)
        self._async_pool: Queue[AsyncLearningPlanner] = Queue(maxsize=pool_size)
        
        # 制御用
        self._semaphore = asyncio.Semaphore(pool_size)
        self._lock = threading.Lock()
        self._initialized = False
        self._shutdown = False
        
        # メトリクス
        self.metrics = ConnectionMetrics()
        self._response_times: List[float] = []
        
        # ヘルスチェック用タスク
        self._health_check_task: Optional[asyncio.Task] = None
    
    async def initialize(self):
        """プールを初期化"""
        if self._initialized:
            return
        
        logger.info(f"🚀 LLMコネクションプール初期化開始 (サイズ: {self.pool_size})")
        
        try:
            # 同期クライアントプールの作成
            for i in range(self.pool_size):
                try:
                    client = learning_plannner()
                    self._pool.put(client)
                    logger.debug(f"✅ 同期クライアント {i+1}/{self.pool_size} 作成完了")
                except Exception as e:
                    logger.error(f"❌ 同期クライアント {i+1} 作成エラー: {e}")
                    # 作成できない場合は続行（最低1個あれば良い）
                    if self._pool.qsize() == 0 and i == self.pool_size - 1:
                        raise Exception("同期クライアントを1つも作成できませんでした")
            
            # 非同期クライアントプールの作成
            for i in range(self.pool_size):
                try:
                    async_client = AsyncLearningPlanner(pool_size=1)  # 個別プール
                    self._async_pool.put(async_client)
                    logger.debug(f"✅ 非同期クライアント {i+1}/{self.pool_size} 作成完了")
                except Exception as e:
                    logger.error(f"❌ 非同期クライアント {i+1} 作成エラー: {e}")
            
            self._initialized = True
            
            # ヘルスチェックタスクを開始
            self._health_check_task = asyncio.create_task(self._health_check_loop())
            
            logger.info(f"✅ LLMコネクションプール初期化完了 (同期: {self._pool.qsize()}, 非同期: {self._async_pool.qsize()})")
            
        except Exception as e:
            logger.error(f"❌ LLMコネクションプール初期化失敗: {e}")
            raise
    
    @asynccontextmanager
    async def get_sync_client(self):
        """
        同期クライアントを取得（コンテキストマネージャー）
        
        Usage:
            async with pool.get_sync_client() as client:
                response = await asyncio.to_thread(
                    client.generate_response,
                    messages
                )
        """
        if not self._initialized:
            await self.initialize()
        
        client = None
        start_time = time.time()
        
        try:
            # セマフォで同時接続数を制御
            async with self._semaphore:
                self.metrics.active_connections += 1
                
                # プールからクライアントを取得
                try:
                    client = await asyncio.wait_for(
                        asyncio.to_thread(self._pool.get, block=True),
                        timeout=self.connection_timeout
                    )
                except asyncio.TimeoutError:
                    self.metrics.error_count += 1
                    self.metrics.last_error_time = time.time()
                    raise Exception("クライアント取得タイムアウト")
                
                yield client
                
        finally:
            # クライアントをプールに戻す
            if client is not None:
                try:
                    self._pool.put(client, block=False)
                except:
                    # プールが満杯の場合は無視（稀なケース）
                    pass
            
            # メトリクス更新
            self.metrics.active_connections -= 1
            self.metrics.total_requests += 1
            
            response_time = time.time() - start_time
            self._response_times.append(response_time)
            
            # 応答時間の移動平均を計算（直近100リクエスト）
            if len(self._response_times) > 100:
                self._response_times = self._response_times[-100:]
            
            self.metrics.avg_response_time = sum(self._response_times) / len(self._response_times)
    
    @asynccontextmanager
    async def get_async_client(self):
        """
        非同期クライアントを取得（コンテキストマネージャー）
        
        Usage:
            async with pool.get_async_client() as client:
                response = await client.generate_response_async(messages)
        """
        if not self._initialized:
            await self.initialize()
        
        client = None
        start_time = time.time()
        
        try:
            async with self._semaphore:
                self.metrics.active_connections += 1
                
                try:
                    client = await asyncio.wait_for(
                        asyncio.to_thread(self._async_pool.get, block=True),
                        timeout=self.connection_timeout
                    )
                except asyncio.TimeoutError:
                    self.metrics.error_count += 1
                    self.metrics.last_error_time = time.time()
                    raise Exception("非同期クライアント取得タイムアウト")
                
                yield client
                
        finally:
            if client is not None:
                try:
                    self._async_pool.put(client, block=False)
                except:
                    pass
            
            self.metrics.active_connections -= 1
            self.metrics.total_requests += 1
            
            response_time = time.time() - start_time
            self._response_times.append(response_time)
            
            if len(self._response_times) > 100:
                self._response_times = self._response_times[-100:]
            
            self.metrics.avg_response_time = sum(self._response_times) / len(self._response_times)
    
    async def _health_check_loop(self):
        """定期ヘルスチェック"""
        while not self._shutdown:
            try:
                await asyncio.sleep(self.health_check_interval)
                await self._health_check()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"ヘルスチェックエラー: {e}")
    
    async def _health_check(self):
        """プールの健全性をチェック"""
        sync_pool_size = self._pool.qsize()
        async_pool_size = self._async_pool.qsize()
        
        logger.info(f"🏥 ヘルスチェック - 同期プール: {sync_pool_size}/{self.pool_size}, "
                   f"非同期プール: {async_pool_size}/{self.pool_size}, "
                   f"アクティブ接続: {self.metrics.active_connections}")
        
        # プールサイズが半分以下になったら警告
        if sync_pool_size < self.pool_size // 2:
            logger.warning(f"⚠️ 同期クライアントプールサイズ低下: {sync_pool_size}/{self.pool_size}")
        
        if async_pool_size < self.pool_size // 2:
            logger.warning(f"⚠️ 非同期クライアントプールサイズ低下: {async_pool_size}/{self.pool_size}")
        
        # エラー率が高い場合の警告
        if self.metrics.total_requests > 0:
            error_rate = self.metrics.error_count / self.metrics.total_requests
            if error_rate > 0.1:  # 10%以上
                logger.warning(f"⚠️ エラー率が高いです: {error_rate:.2%}")
    
    async def get_metrics(self) -> Dict[str, Any]:
        """メトリクス情報を取得"""
        return {
            "pool_size": self.pool_size,
            "sync_available": self._pool.qsize(),
            "async_available": self._async_pool.qsize(),
            "active_connections": self.metrics.active_connections,
            "total_requests": self.metrics.total_requests,
            "error_count": self.metrics.error_count,
            "error_rate": self.metrics.error_count / max(self.metrics.total_requests, 1),
            "avg_response_time": self.metrics.avg_response_time,
            "last_error_time": self.metrics.last_error_time,
            "initialized": self._initialized
        }
    
    async def shutdown(self):
        """プールをシャットダウン"""
        logger.info("🛑 LLMコネクションプールシャットダウン開始")
        
        self._shutdown = True
        
        # ヘルスチェックタスクを停止
        if self._health_check_task:
            self._health_check_task.cancel()
            try:
                await self._health_check_task
            except asyncio.CancelledError:
                pass
        
        # プール内のクライアントをクリーンアップ
        while not self._pool.empty():
            try:
                client = self._pool.get_nowait()
                # 必要に応じてクライアントのクリーンアップ処理
            except Empty:
                break
        
        while not self._async_pool.empty():
            try:
                client = self._async_pool.get_nowait()
                # 必要に応じてクライアントのクリーンアップ処理
            except Empty:
                break
        
        logger.info("✅ LLMコネクションプールシャットダウン完了")


# グローバルプールインスタンス
_global_llm_pool: Optional[LLMConnectionPool] = None


async def get_llm_pool(
    pool_size: int = 10,
    max_queue_size: int = 100,
    connection_timeout: float = 30.0
) -> LLMConnectionPool:
    """
    グローバルLLMプールを取得
    
    Args:
        pool_size: プールサイズ
        max_queue_size: 最大キューサイズ
        connection_timeout: 接続タイムアウト
        
    Returns:
        LLMConnectionPool インスタンス
    """
    global _global_llm_pool
    
    if _global_llm_pool is None:
        _global_llm_pool = LLMConnectionPool(
            pool_size=pool_size,
            max_queue_size=max_queue_size,
            connection_timeout=connection_timeout
        )
        await _global_llm_pool.initialize()
    
    return _global_llm_pool


async def shutdown_llm_pool():
    """グローバルLLMプールをシャットダウン"""
    global _global_llm_pool
    
    if _global_llm_pool:
        await _global_llm_pool.shutdown()
        _global_llm_pool = None


# ===================================
# 使用例とベンチマーク
# ===================================

async def benchmark_pool_vs_single():
    """プール使用と単一インスタンスのベンチマーク"""
    import time
    
    # 単一インスタンス（従来方式）
    single_client = learning_plannner()
    
    # プール方式
    pool = await get_llm_pool(pool_size=5)
    
    messages = [
        {"role": "system", "content": "あなたは学習支援AIです。"},
        {"role": "user", "content": "こんにちは"}
    ]
    
    # 単一インスタンスのテスト（10リクエスト順次処理）
    start_time = time.time()
    for i in range(10):
        response = await asyncio.to_thread(
            single_client.generate_response,
            messages
        )
    single_time = time.time() - start_time
    
    # プール方式のテスト（10リクエスト並列処理）
    async def pool_request():
        async with pool.get_async_client() as client:
            return await client.generate_response_async(messages)
    
    start_time = time.time()
    tasks = [pool_request() for _ in range(10)]
    responses = await asyncio.gather(*tasks)
    pool_time = time.time() - start_time
    
    logger.info(f"📊 ベンチマーク結果:")
    logger.info(f"   単一インスタンス: {single_time:.2f}秒")
    logger.info(f"   プール方式: {pool_time:.2f}秒")
    logger.info(f"   改善率: {((single_time - pool_time) / single_time * 100):.1f}%")
    
    return {
        "single_instance_time": single_time,
        "pool_time": pool_time,
        "improvement_percentage": (single_time - pool_time) / single_time * 100
    }


if __name__ == "__main__":
    # テスト実行
    asyncio.run(benchmark_pool_vs_single())