import os
from openai import OpenAI
from dotenv import load_dotenv
from prompt.prompt import OBJECT_PROMPT, GOAL_PROMPT, CONTENT_PROMPT, PLANNER_PROMPT

class learning_plannner():
    def __init__(self):
        load_dotenv()
        self.model = "gpt-4o"
        self.client = OpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )
    
    def make_object_from_interest(self, interest:str):
        #対話履歴の初期化
        messages=[{"role": "developer", "content": f"{OBJECT_PROMPT}"}]

        #DBから取得した興味関心を渡して応答を取得
        messages.append({
            "role": "user",
            "content": f"{interest}。"
            #"content": f"{interest}. Please ask a question to turn this interest into a concrete goal."
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
                user_input =  input("You： ")
                messages.append({
                    "role": "user",
                    "content": user_input
                })
        
        return final_response
    
    def make_goal_from_object(self, object:str):
        #対話履歴の初期化
        messages=[{"role": "developer", "content": f"{GOAL_PROMPT}"}]

        #DBから取得した興味関心を渡して応答を取得
        messages.append({
            "role": "user",
            "content": f"{object}。この目的から、探究的な学習の目標の言語化を促進する質問をしてください。"
            #"content": f"{interest}. Please ask a question to turn this interest into a concrete goal."
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
                user_input =  input("You： ")
                messages.append({
                    "role": "user",
                    "content": user_input
                })
        
        return final_response
    
    def make_content_from_goal(self, goal:str):
        #対話履歴の初期化
        messages=[{"role": "developer", "content": f"{CONTENT_PROMPT}"}]

        #DBから取得した興味関心を渡して応答を取得
        messages.append({
            "role": "user",
            "content": f"{goal}。目標に向けて、具体的にどのような探究、学習を行うか選択肢を提案しながら一緒に考える質問をしてください。"
            #"content": f"{interest}. Please ask a question to turn this interest into a concrete goal."
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
                user_input =  input("You： ")
                messages.append({
                    "role": "user",
                    "content": user_input
                })
        
        return final_response
    #LLMで学習計画を自動作成する関数
    def make_learning_plan(self, content:str):
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "developer", "content": f"{PLANNER_PROMPT}"},
                {
                    "role": "user",
                    "content": f"{content}。この学習内容に取り組む3ステップの学習計画を提案してください。なお、見やすいように3行の箇条書きでシンプルかつ簡潔にまとめてください。"
                    #"content": f"{goal}. Please propose a 3-step study plan for this learning goal. Additionally, summarize it in 3 simple and concise bullet points for easy reading."
                }
            ]
        )

        return response.choices[0].message.content

