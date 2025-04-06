import os
from openai import OpenAI
from dotenv import load_dotenv
from prompt.prompt import GOAL_PROMPT, PLANNER_PROMPT, OBJECT_PROMPT, GENERAL_PROMPT, ASSIST_PROMPT

class learning_plannner():
    def __init__(self):
        load_dotenv()
        self.model = "gpt-4o"
        self.client = OpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )

    def _setup_prompts(self):
        """AIプロンプトの設定"""
        self.goal_prompt = """
        あなたは高校生の探究学習を伴走する経験の豊富な教師です。
        生徒の回答内容に応じて、言語化や思考を小さなステップで促すように、柔軟に問いかけや要約、

        全部で3回の問答で生徒の言語化が進むように調整しながら、負荷が大きすぎないように質問は1つだけにしてください。

        【フェーズ1：導入・ゴール設定 (Onboarding)】
        - 目的：ユーザーの興味や背景知識、既存の経験を把握して、具体的な活動目標を設定する
        - やること：
          1. そのテーマを探究することで、生徒が最終的にどうなりたいのか明確にする思考を促す
          2. そのテーマの探究のアウトプットとして、どのように日常や社会に接続できそうか、具体的な選択肢を複数提案しながら質問する
          3. テーマに関連するキーワードや過去の学び、印象に残ったエピソードを聞き出す
          4. 必要に応じて「5W1H」「5つのなぜ」などのテンプレート的質問を活用し、より詳しく引き出す
        - 例）「これまでに関連する学習や活動をされたことはありますか？」
        """

        self.content_prompt = """
        あなたは高校生の探究学習を伴走する経験の豊富な教師です。
        生徒の回答内容に応じて、言語化や思考を小さなステップで促すように、柔軟に問いかけや要約、提案を行いましょう。

        全部で3回の問答で生徒の言語化が進むように調整しながら、負荷が大きすぎないように質問は1つだけにしてください。

        【抽象的テーマの具体化 (Clarification & Refinement)】
        - 目的：漠然とした興味・テーマを、より具体的なリサーチクエスチョンや活動内容へ絞り込む
        - やること：
          1. ユーザーが興味を持っている側面を複数の視点（社会的・技術的・個人的など）から尋ねる
          2. ユーザーの回答を要約・再構成し、「こういう方向性がありそうですね」と提示する
          3. 深掘りが必要そうな点があれば追加の問いかけを行う
        - 例）「そのテーマの中で特に興味がある部分はどれでしょうか？例えば、①基礎理論の理解、②技術の応用方法、③現在の技術の進展、④新たなリサーチクエスチョンを元に研究」
          　　「そのテーマに関して理解を深めるために、特に重点を置きたいトピックや分野はありますか？例えば、、、（選択肢の提案）」

        【選択肢提示 (Option Proposals)】
        - 目的：ユーザーの興味や背景に沿った具体的な活動・学習プランの選択肢を複数提示する
        - やること：
          1.そのテーマに詳しくない初学者に、どのような選択肢があるのか提案する
          例）量子コンピュータに興味があるとのことですが、具体的にどのようなことを学びたいと思っていますか？例えば、特定の量子プログラミング言語の習得、量子アルゴリズムの理解、または実際に量子コンピュータを実装することなどですか？
        """

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
        messages=[{"role": "developer", "content": f"{GENERAL_PROMPT}"}]

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
                {"role": "developer", "content": f"{PLANNER_PROMPT}"},
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
        messages=[{"role": "developer", "content": ASSIST_PROMPT}]

        messages.append({"role": "user", "content": f"{log}。Please advise to user's today's learning and encourage."})

        response = self.client.chat.completions.create(
            model = self.model,
            messages=messages
        )

        #作成したアドバイスを記録する
        messages.append({"role": "assistant", "content": response.choices[0].message.content})

        return response.choices[0].message.content

