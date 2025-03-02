import os
from openai import OpenAI
from dotenv import load_dotenv
from prompt.prompt import ASSIST_PROMPT

class learning_assistant():
    def __init__(self):
        load_dotenv()
        self.model = "gpt-4o-mini"
        self.client = OpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )

    #学習記録を元に、学習計画の達成に向けたアドバイスを自動作成する
    def get_advise(self, log:str, plan:str):
        
        #対話履歴の初期化
        messages=[{"role": "developer", "content": ASSIST_PROMPT }]

        messages.append({"role": "user", "content": f"{log}。今日やったことを元に、{plan}に向けてアドバイスと応援メッセージが欲しいです。"})

        response = self.client.chat.completions.create(
            model = self.model,
            messages=messages
        )

        #作成したアドバイスを記録する
        messages.append({"role": "assistant", "content": response.choices[0].message.content})

        return response.choices[0].message.content

        