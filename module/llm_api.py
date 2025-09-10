import os
from typing import List, Dict, Any
from openai import OpenAI
from dotenv import load_dotenv
from prompt.prompt import system_prompt

class learning_plannner():
    def __init__(self):
        load_dotenv()
        self.model = "gpt-4.1"
        
        # 環境変数からAPIキーを取得
        api_key = os.getenv("OPENAI_API_KEY")
        
        if not api_key:
            raise ValueError("OpenAI APIキーが設定されていません。環境変数OPENAI_API_KEYを設定してください。")
        
        self.client = OpenAI(api_key=api_key)

    def generate_response(self, messages: List[Dict[str, str]], temperature: float = 0.7, max_tokens: int = None) -> str:
        """
        統合された対話関数（履歴ベース）
        
        Args:
            messages: 必須。[{"role": "system/user/assistant", "content": "..."}]
            temperature: 応答の創造性（0.0-1.0）
            max_tokens: 最大トークン数
            
        Returns:
            str: 生成された応答テキスト
        """
        request_params = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature
        }
        
        if max_tokens is not None:
            request_params["max_tokens"] = max_tokens
            
        response = self.client.chat.completions.create(**request_params)
        return response.choices[0].message.content
    
    def generate_response_with_history(self, messages: list):
        """後方互換性のためのラッパー関数"""
        return self.generate_response(messages)

    def _to_input_items(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Chat Completionsの messages([{role, content:str|list}]) を
        Responses APIの input(items: role + content-parts) に変換
        """
        items = []
        for m in messages:
            c = m.get("content", "")
            # 文字列のみ想定（必要ならlist対応を拡張）
            if isinstance(c, list):
                # 既にparts想定の形式ならそのまま使う
                parts = c
            else:
                parts = [{"type": "input_text", "text": str(c)}]
            items.append({"role": m["role"], "content": parts})
        return items

    def generate_response_with_WebSearch(self, messages: List[Dict[str, Any]]) -> str:
        """
        DBから復元した会話履歴（system→過去→今回user）をそのまま渡す版。
        例: [{"role":"system","content":"..."},
             {"role":"user","content":"..."},
             {"role":"assistant","content":"..."},
             {"role":"user","content":"..."}]
        """
        input_items = self._to_input_items(messages)
        resp = self.client.responses.create(
            model=self.model,
            input=input_items,
            tools=[{"type": "web_search_preview"}],  # "web_search" → "web_search_preview"に修正
            store=True,
        )
        return resp.output_text