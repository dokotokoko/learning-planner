"""
非同期対応版 LLM APIクライアント
既存の learning_plannner クラスを拡張し、非同期処理に対応します。
"""

import os
import asyncio
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI, OpenAI
from dotenv import load_dotenv
from prompt.prompt import system_prompt
from module.llm_api import learning_plannner


class AsyncLearningPlanner(learning_plannner):
    """
    非同期対応版の learning_plannner
    既存のクラスを継承し、非同期メソッドを追加
    """
    
    def __init__(self, pool_size: int = 5):
        """
        初期化
        
        Args:
            pool_size: 並列処理用のクライアントプール数
        """
        super().__init__()
        
        # 非同期クライアントの初期化
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OpenAI APIキーが設定されていません。環境変数OPENAI_API_KEYを設定してください。")
        
        # 非同期クライアントを作成
        self.async_client = AsyncOpenAI(
            api_key=api_key,
            timeout=30.0,  # タイムアウトを30秒に設定
            max_retries=2   # リトライを2回に制限
        )
        
        # セマフォでAPI同時呼び出し数を制限
        self.semaphore = asyncio.Semaphore(pool_size)
        
        # メトリクス収集用
        self.request_count = 0
        self.total_response_time = 0.0
    
    async def generate_response_async(self, messages: List[Dict[str, Any]]) -> str:
        """
        対話履歴を考慮してLLMから非同期で応答を生成
        
        Args:
            messages: メッセージ履歴
            
        Returns:
            LLMからの応答テキスト
        """
        import time
        start_time = time.time()
        
        try:
            # セマフォを使用して同時実行数を制限
            async with self.semaphore:
                response = await self.async_client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=0.7,
                    max_tokens=2000
                )
                
                # メトリクス更新
                response_time = time.time() - start_time
                self.request_count += 1
                self.total_response_time += response_time
                
                if self.request_count % 10 == 0:  # 10リクエストごとにログ
                    avg_time = self.total_response_time / self.request_count
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.info(f"📊 OpenAI API平均応答時間: {avg_time:.2f}秒")
                
                return response.choices[0].message.content
                
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"❌ OpenAI API非同期呼び出しエラー: {e}")
            
            # フォールバック: 同期版を非同期で実行
            return await asyncio.to_thread(
                self.generate_response,
                messages
            )
    
    async def generate_response_streaming(
        self, 
        messages: List[Dict[str, Any]], 
        callback: Optional[callable] = None
    ):
        """
        ストリーミング対応の非同期レスポンス生成
        
        Args:
            messages: メッセージ履歴
            callback: チャンクごとに呼ばれるコールバック関数
            
        Yields:
            レスポンスのチャンク
        """
        try:
            async with self.semaphore:
                stream = await self.async_client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=0.7,
                    max_tokens=2000,
                    stream=True
                )
                
                full_content = ""
                async for chunk in stream:
                    if chunk.choices[0].delta.content is not None:
                        content = chunk.choices[0].delta.content
                        full_content += content
                        
                        if callback:
                            await callback(content)
                        
                        yield content
                
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"❌ ストリーミングAPI呼び出しエラー: {e}")
            raise
    
    async def batch_generate_responses(
        self, 
        message_sets: List[List[Dict[str, Any]]]
    ) -> List[str]:
        """
        複数のメッセージセットを並列で処理
        
        Args:
            message_sets: メッセージセットのリスト
            
        Returns:
            レスポンスのリスト
        """
        tasks = [
            self.generate_response_async(messages)
            for messages in message_sets
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # エラーハンドリング
        responses = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"バッチ処理エラー (index={i}): {result}")
                responses.append("申し訳ございません。処理中にエラーが発生しました。")
            else:
                responses.append(result)
        
        return responses
    
    async def generate_with_fallback(
        self, 
        messages: List[Dict[str, Any]], 
        fallback_model: Optional[str] = "gpt-3.5-turbo"
    ) -> str:
        """
        フォールバック機能付きレスポンス生成
        
        Args:
            messages: メッセージ履歴
            fallback_model: フォールバック用のモデル名
            
        Returns:
            LLMからの応答
        """
        try:
            # まずメインモデルで試行
            return await self.generate_response_async(messages)
            
        except Exception as primary_error:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"⚠️ プライマリモデルエラー、フォールバックを使用: {primary_error}")
            
            if fallback_model:
                try:
                    # フォールバックモデルで再試行
                    async with self.semaphore:
                        response = await self.async_client.chat.completions.create(
                            model=fallback_model,
                            messages=messages,
                            temperature=0.7,
                            max_tokens=1500  # フォールバックは少し制限
                        )
                        return response.choices[0].message.content
                        
                except Exception as fallback_error:
                    logger.error(f"❌ フォールバックモデルもエラー: {fallback_error}")
                    raise
            else:
                raise primary_error
    
    def get_metrics(self) -> Dict[str, Any]:
        """
        メトリクス情報を取得
        
        Returns:
            メトリクス情報のDict
        """
        if self.request_count == 0:
            return {
                "total_requests": 0,
                "average_response_time": 0,
                "active_connections": self.semaphore._value if hasattr(self.semaphore, '_value') else None
            }
        
        return {
            "total_requests": self.request_count,
            "average_response_time": self.total_response_time / self.request_count,
            "active_connections": self.semaphore._value if hasattr(self.semaphore, '_value') else None
        }


# シングルトンインスタンスを管理
_async_llm_instance: Optional[AsyncLearningPlanner] = None

def get_async_llm_client(pool_size: int = 5) -> AsyncLearningPlanner:
    """
    非同期LLMクライアントのシングルトンを取得
    
    Args:
        pool_size: プールサイズ（初回のみ有効）
        
    Returns:
        AsyncLearningPlannerのインスタンス
    """
    global _async_llm_instance
    
    if _async_llm_instance is None:
        _async_llm_instance = AsyncLearningPlanner(pool_size=pool_size)
    
    return _async_llm_instance