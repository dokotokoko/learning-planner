"""
探究学習の問い生成支援API
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import asyncio
from openai import AsyncOpenAI
import os

router = APIRouter(prefix="/api/inquiry", tags=["inquiry"])

# OpenAI clientをasyncで初期化
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class RelatedWordsRequest(BaseModel):
    keyword: str

class RelatedWordsResponse(BaseModel):
    suggestions: List[str]

class ClusterRequest(BaseModel):
    keywords: List[str]
    max_clusters: Optional[int] = 5

class ClusterResponse(BaseModel):
    clusters: List[Dict[str, Any]]

class DeepQuestionRequest(BaseModel):
    keyword: str
    context: Optional[str] = ""

class DeepQuestionResponse(BaseModel):
    questions: List[Dict[str, str]]

class EvaluateQuestionRequest(BaseModel):
    question: str
    context: Optional[Dict[str, Any]] = {}

class EvaluateQuestionResponse(BaseModel):
    scores: Dict[str, float]
    comment: str
    suggestions: List[str]

class InquiryChatRequest(BaseModel):
    message: str
    context: Dict[str, Any]

class InquiryChatResponse(BaseModel):
    response: str
    question_seeds: Optional[List[Dict[str, str]]] = None
    action_type: Optional[str] = None

@router.post("/related-words", response_model=RelatedWordsResponse)
async def get_related_words(request: RelatedWordsRequest):
    """
    キーワードから関連語を提案する
    """
    try:
        prompt = f"""
        「{request.keyword}」という言葉から連想される関連キーワードを5つ提案してください。
        以下の観点から多様な提案をしてください：
        - より具体的な側面
        - 関連する社会問題
        - 歴史的な文脈
        - 未来への影響
        - 個人的な関わり
        
        回答は単語またh短いフレーズのリストで返してください。
        """
        
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "あなたは探究学習をサポートするアシスタントです。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.8,
            max_tokens=200
        )
        
        # レスポンスをパース
        content = response.choices[0].message.content
        suggestions = [line.strip().replace("- ", "").replace("・", "").strip() 
                      for line in content.split("\n") 
                      if line.strip() and not line.startswith("#")][:5]
        
        return RelatedWordsResponse(suggestions=suggestions)
    
    except Exception as e:
        print(f"Error in get_related_words: {e}")
        # フォールバック
        return RelatedWordsResponse(
            suggestions=[
                f"{request.keyword}の歴史",
                f"{request.keyword}と社会",
                f"{request.keyword}の未来",
                f"{request.keyword}と環境",
                f"{request.keyword}の課題"
            ]
        )

@router.post("/cluster", response_model=ClusterResponse)
async def create_clusters(request: ClusterRequest):
    """
    キーワードをクラスタリングする
    """
    try:
        prompt = f"""
        以下のキーワードを意味的に近いグループに分類してください。
        最大{request.max_clusters}個のグループに分けてください。
        
        キーワード: {", ".join(request.keywords)}
        
        JSONフォーマットで、各グループに名前をつけて返してください。
        例:
        [
            {{"name": "グループ名", "keywords": ["キーワード1", "キーワード2"]}},
            ...
        ]
        """
        
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "あなたはキーワードを分類する専門家です。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_tokens=500
        )
        
        content = response.choices[0].message.content
        # JSON部分を抽出
        import re
        json_match = re.search(r'\[.*\]', content, re.DOTALL)
        if json_match:
            clusters = json.loads(json_match.group())
            return ClusterResponse(clusters=clusters)
        else:
            # フォールバック
            return ClusterResponse(clusters=[
                {"name": "グループ1", "keywords": request.keywords[:len(request.keywords)//2]},
                {"name": "グループ2", "keywords": request.keywords[len(request.keywords)//2:]}
            ])
    
    except Exception as e:
        print(f"Error in create_clusters: {e}")
        return ClusterResponse(clusters=[
            {"name": "すべて", "keywords": request.keywords}
        ])

@router.post("/deep-questions", response_model=DeepQuestionResponse)
async def generate_deep_questions(request: DeepQuestionRequest):
    """
    キーワードを深める問いを生成する
    """
    try:
        prompt = f"""
        「{request.keyword}」について深く探究するための問いを4つ生成してください。
        以下の観点から1つずつ：
        1. 出来事・事実を問う
        2. 人・関係者を問う
        3. 場所・環境を問う
        4. 感情・価値観を問う
        
        {f"追加コンテキスト: {request.context}" if request.context else ""}
        
        各問いは短く具体的にしてください。
        """
        
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "あなたは探究学習の問いを作る専門家です。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=300
        )
        
        content = response.choices[0].message.content
        lines = content.split("\n")
        questions = []
        categories = ["event", "person", "place", "emotion"]
        
        for i, line in enumerate(lines[:4]):
            if line.strip():
                questions.append({
                    "content": line.strip().replace(f"{i+1}.", "").strip(),
                    "category": categories[i % 4]
                })
        
        return DeepQuestionResponse(questions=questions)
    
    except Exception as e:
        print(f"Error in generate_deep_questions: {e}")
        return DeepQuestionResponse(questions=[
            {"content": f"{request.keyword}はどのような出来事と関連していますか？", "category": "event"},
            {"content": f"{request.keyword}に関わる人々は誰ですか？", "category": "person"},
            {"content": f"{request.keyword}はどこで起きていますか？", "category": "place"},
            {"content": f"{request.keyword}についてどう感じますか？", "category": "emotion"}
        ])

@router.post("/evaluate", response_model=EvaluateQuestionResponse)
async def evaluate_question(request: EvaluateQuestionRequest):
    """
    問いを4つの観点で評価する
    """
    try:
        prompt = f"""
        以下の探究の問いを評価してください：
        「{request.question}」
        
        4つの観点でそれぞれ0-100のスコアをつけてください：
        1. 主体性: 個人的な関心や動機が感じられるか
        2. 探究可能性: 調査や研究によって答えを見つけられるか
        3. スコープ: 問いの範囲は適切か（広すぎず狭すぎず）
        4. 解像度: 問いは具体的で明確か
        
        また、改善のための短いコメントと、具体的な改善案を3つ提案してください。
        
        回答はJSONフォーマットで：
        {{
            "scores": {{"subjectivity": 数値, "explorability": 数値, "scope": 数値, "resolution": 数値}},
            "comment": "コメント",
            "suggestions": ["提案1", "提案2", "提案3"]
        }}
        """
        
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "あなたは探究学習の問いを評価する専門家です。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_tokens=400
        )
        
        content = response.choices[0].message.content
        # JSON部分を抽出
        import re
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
            return EvaluateQuestionResponse(
                scores=result["scores"],
                comment=result["comment"],
                suggestions=result["suggestions"]
            )
    
    except Exception as e:
        print(f"Error in evaluate_question: {e}")
    
    # フォールバック
    return EvaluateQuestionResponse(
        scores={
            "subjectivity": 70,
            "explorability": 75,
            "scope": 65,
            "resolution": 60
        },
        comment="この問いは良い出発点ですが、もう少し具体的にできそうです。",
        suggestions=[
            "対象を特定の地域や期間に限定してみる",
            "「なぜ」や「どのように」を追加して深める",
            "自分との関わりを明確にする"
        ]
    )

@router.post("/chat", response_model=InquiryChatResponse)
async def inquiry_chat(request: InquiryChatRequest):
    """
    探究支援のためのAIチャット
    """
    try:
        step = request.context.get("step", 1)
        center_keyword = request.context.get("centerKeyword", "")
        all_keywords = request.context.get("allKeywords", [])
        
        system_prompt = f"""
        あなたは探究学習の問い作りをサポートするAIアシスタントです。
        現在ステップ{step}です。
        
        ユーザーの中心キーワード: {center_keyword}
        関連キーワード: {', '.join(all_keywords)}
        
        ステップに応じて適切にサポートしてください：
        - Step 1: キーワードの発散を促す
        - Step 2: 中心キーワードを深める質問をする
        - Step 3: 問いの種から具体的な問いへ発展させる
        - Step 4: 最終的な問いの決定を支援する
        """
        
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.message}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        ai_response = response.choices[0].message.content
        
        # Step 2の場合、問いの種を抽出
        question_seeds = None
        if step == 2 and center_keyword:
            # ユーザーの発言から問いの種を見つける
            if "？" in request.message or "なぜ" in request.message or "どう" in request.message:
                question_seeds = [{
                    "content": request.message,
                    "sourceKeyword": center_keyword,
                    "category": "user_generated"
                }]
        
        return InquiryChatResponse(
            response=ai_response,
            question_seeds=question_seeds,
            action_type="explore" if step <= 2 else "refine"
        )
    
    except Exception as e:
        print(f"Error in inquiry_chat: {e}")
        return InquiryChatResponse(
            response="申し訳ございません。応答の生成中にエラーが発生しました。もう一度お試しください。"
        )