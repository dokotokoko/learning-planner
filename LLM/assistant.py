import os
from openai import OpenAI
from dotenv import load_dotenv
from prompt.prompt import ASSIST_PROMPT_EN

class learning_assistant():
    def __init__(self):
        load_dotenv()
        self.model = "gpt-4o"
        self.client = OpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )

    #学習記録を元にアドバイスを自動作成する
    def get_advise(self, log:str):
        
        #対話履歴の初期化
        messages=[{"role": "developer", "content": ASSIST_PROMPT_EN }]

        messages.append({"role": "user", "content": f"{log}。Please advise to user's today's learning and encourage."})

        response = self.client.chat.completions.create(
            model = self.model,
            messages=messages
        )

        #作成したアドバイスを記録する
        messages.append({"role": "assistant", "content": response.choices[0].message.content})

        return response.choices[0].message.content

        