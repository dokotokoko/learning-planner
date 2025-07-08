import os
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

    def generate_response(self, prompt, user_input):
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": user_input}
            ]
        )
        return response.choices[0].message.content
    
    def make_object_from_interest(self, interest:str):
        #対話履歴の初期化
        messages=[{"role": "developer", "content": f"{system_prompt}"}]

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
        messages=[{"role": "developer", "content": f"{system_prompt}"}]

        #DBから取得した興味関心を渡して応答を取得
        messages.append({
            "role": "user",
            "content": f"{object}。この目的を元に探究学習の目標を言語化するサポートになる質問をしてください。"
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
    def make_learning_plan(self, goal:str):
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "developer", "content": f"{system_prompt}"},
                {
                    "role": "user",
                    "content": f"{goal}。この目標に取り組む3ステップの学習計画を提案してください。"
                    #"content": f"{goal}. Please propose a 3-step study plan for this learning goal. Additionally, summarize it in 3 simple and concise bullet points for easy reading."
                }
            ]
        )

        return response.choices[0].message.content
    
    #学習記録を元にアドバイスを自動作成する
    def get_advise(self, log:str):
        
        #対話履歴の初期化
        messages=[{"role": "developer", "content": system_prompt}]

        messages.append({"role": "user", "content": f"{log}。Please advise to user's today's learning and encourage."})

        response = self.client.chat.completions.create(
            model = self.model,
            messages=messages
        )

        #作成したアドバイスを記録する
        messages.append({"role": "assistant", "content": response.choices[0].message.content})

        return response.choices[0].message.content

    def handle_general_inquiry(self, user_input: str, history: list = None):
        if history is None:
            messages = [{"role": "system", "content": GENERAL_PROMPT}]
        else:
            messages = history
        
        messages.append({"role": "user", "content": user_input})

        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages
        )
        
        assistant_response = response.choices[0].message.content
        messages.append({"role": "assistant", "content": assistant_response})
        
        return assistant_response, messages

    def generate_response_with_history(self, messages: list):
        """対話履歴を考慮してLLMから応答を生成"""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages
        )
        return response.choices[0].message.content

