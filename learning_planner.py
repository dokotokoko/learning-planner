import os
from openai import OpenAI
from dotenv import load_dotenv
from prompt import CUSTOM_PROMPT

#OpenAIのLLMを作成

class learning_plannner():
    def __init__(self):
        load_dotenv()
        self.custom_prompt = CUSTOM_PROMPT
        self.client = OpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )

    #LLMで学習計画を自動作成する関数
    def make_learning_plan(self, interest:str):
        completion = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "developer", "content": f"{self.custom_prompt}"},
                {
                    "role": "user",
                    "content": f"{interest}。これを学習するための3ステップの学習計画を提案してください。"
                }
            ]
        )

        return completion.choices[0].message.content

