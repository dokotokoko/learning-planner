import os
from openai import OpenAI
from dotenv import load_dotenv
from prompt import PLANNER_PROMPT
from prompt import GOAL_PROMPT

#OpenAIのLLMを作成

class learning_plannner():
    def __init__(self):
        load_dotenv()
        self.model = "gpt-4o-mini"
        self.client = OpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )
    
    def make_goal_from_interest(self, interest:str):
        #対話履歴の初期化
        messages=[{"role": "developer", "content": f"{GOAL_PROMPT}"}]

        #DBから取得した興味関心を渡して応答を取得
        messages.append({
            "role": "user",
            "content": f"{interest}。この興味を具体的な目標にするための質問をしてください。"
        })

        final_response = None #最終的な決定（目標）を保持する変数を作成

        #LLMとの対話を開始
        for i in range(2):
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages
            )

            got_response = response.choices[0].message.content
            print(f"AI Planner: {got_response}")

            messages.append({
                "role": "assistant",
                "content": got_response
            })

            final_response = got_response

            #最終ラウンド以外の場合は、ユーザーからの応答を受け取る
            if i < 2:
                user_input =  input("あなた： ")
                messages.append({
                    "role": "user",
                    "content": user_input
                })
        
        return final_response


    #LLMで学習計画を自動作成する関数
    def make_learning_plan(self, goal:str):
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "developer", "content": f"{PLANNER_PROMPT}"},
                {
                    "role": "user",
                    "content": f"{goal}。この学習目標に向けた3ステップの学習計画を提案してください。なお、見やすいように3行の箇条書きでシンプルかつ簡潔にまとめてください。"
                }
            ]
        )

        return response.choices[0].message.content

