import os
from openai import OpenAI
from dotenv import load_dotenv

#OpenAIのLLMを作成

class learning_plannner():
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.prompt = os.getenv("PROMPT")
        self.client = OpenAI()

def make_learning_plan(self, interest:str):
    completion = self.client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "f{self.prompt}"},
            {
                "role": "user",
                "content": "f{interest}"
            }
        ]
    )
#LLMで学習計画を自動作成する関数

