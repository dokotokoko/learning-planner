import streamlit as st
from streamlit_chat import message

from module.db_manager import DBManager
from module.llm_api import learning_plannner
from prompt.prompt import goal_prompt, content_prompt

# DBの設定
DB_FILE = "IBL-assistant.db"

class StreamlitApp:
    def __init__(self):
        """アプリケーションの初期化"""
        self.db_manager = DBManager()
        self.planner = learning_plannner()
        self._initialize_session_state()

    def _initialize_session_state(self):
        """セッション状態の初期化"""
        if "page" not in st.session_state:
            st.session_state.page = 1
        if "authenticated" not in st.session_state:
            st.session_state.authenticated = False
        if "user_id" not in st.session_state:
            st.session_state.user_id = None
        if "username" not in st.session_state:
            st.session_state.username = None

    def next_page(self):
        """次のページに進む"""
        st.session_state.page += 1

    def prev_page(self):
        """前のページに戻る"""
        st.session_state.page -= 1

    def is_active(self, step_number):
        """指定されたステップが現在のページと同じかそれ以前なら'active'を返す"""
        current_page = st.session_state.page
        return "active" if step_number <= current_page else ""

    def make_sequence_bar(self):
        """ステッププログレスバーを表示"""
        st.markdown(f"""
        <style>
        .step-container {{
            display: flex;
            justify-content: space-between;
            margin: 30px 0;
            max-width: 600px;
        }}
        .step {{
            position: relative;
            flex: 1;
            text-align: center;
        }}
        .step .circle {{
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background-color: #cccccc;
            margin: 0 auto;
            z-index: 2;
            position: relative;
        }}
        .step.active .circle {{
            background-color: #2E8EF6; /* アクティブ時の色 */
        }}
        .step .label {{
            margin-top: 8px;
        }}
        /* 線（バー）のスタイル */
        .step::before {{
            content: "";
            position: absolute;
            top: 15px; /* 円の縦位置に合わせる */
            left: -50%;
            width: 100%;
            height: 4px;
            background-color: #cccccc;
            z-index: 1;
        }}
        .step:first-child::before {{
            content: none; /* 先頭ステップの左側には線を描画しない */
        }}
        .step.active::before {{
            background-color: #2E8EF6; /* アクティブ時の色 */
        }}
        </style>

        <div class="step-container">
            <div class="step {self.is_active(1)}">
                <div class="circle"></div>
                <div class="label">Step 1</div>
            </div>
            <div class="step {self.is_active(2)}">
                <div class="circle"></div>
                <div class="label">Step 2</div>
            </div>
            <div class="step {self.is_active(3)}">
                <div class="circle"></div>
                <div class="label">Step 3</div>
            </div>
            <div class="step {self.is_active(4)}">
                <div class="circle"></div>
                <div class="label">Step 4</div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    @st.dialog("このステップでやること！")
    def show_guide_dialog(self, step_number):
        """各ステップのガイドダイアログを表示"""
        dialog_key = f"dialog_closed_page{step_number}"
        
        # 既に表示済みかチェック
        if dialog_key not in st.session_state or not st.session_state[dialog_key]:
            dialog_title = {
                1: "テーマ設定の思考サポート",
                2: "ゴール設定の思考サポート", 
                3: "アイディエーションの思考サポート",
                4: "最終成果物作成の思考サポート"
            }
            
            dialog_content = {
                1: """この画面では、探究学習のテーマを入力してください。
                後からゴールや学習計画を設定する際の出発点となります。
                
                例えば以下のような視点で考えてみましょう：
                - 社会問題や身近な疑問・課題
                - 将来の夢や目標に関連するテーマ
                - これまでに学んできた中で特に興味を持ったこと""",
                
                2: """この画面では、テーマを具体的な目標に落とし込みます。
                
                以下の質問に答えていくことで、目標が明確になります：
                - なぜそのテーマに興味を持ったのですか？
                - 探究を通じて何を理解したいですか？
                - 最終的にどんな成果物を作りたいですか？""",
                
                3: """この画面では、目標達成のための具体的な活動内容を考えます。
                
                以下のような観点で検討してみましょう：
                - どんな調査・実験が必要か
                - 誰に話を聞くか
                - どんな資料を集めるか
                - どのように分析するか""",
                
                4: """最終ステップでは、これまでの探究活動をまとめます。
                
                以下の点を整理しましょう：
                - 何を学んだか
                - どんな成果が得られたか
                - 今後の課題は何か"""
            }

            st.write(dialog_content[step_number])
            st.session_state[dialog_key] = True


    def render_page1(self):
        """テーマ設定ページの表示"""      
        st.title("Step1: 自分の興味から探究学習のテーマを決める！")

        # 現在のステップを表示
        self.make_sequence_bar()

        theme = st.text_input("探究学習のテーマを入力してください。")

        if st.button("テーマを決定する"):
            if theme:
                try:
                    self.db_manager.save_interests(user_id=st.session_state.user_id, interest=theme)
                    st.success(f"テーマ '{theme}' を保存しました (user_id: {st.session_state.user_id})")
                    st.session_state.user_theme = theme
                except Exception as e:
                    st.error(f"テーマの保存に失敗: {str(e)}")

        if st.button("次へ"):
            self.next_page()
            st.rerun()

        # このページでやることのガイドを表示（インデックス指定）
        page_index = 1;
        dialog_key = f"dialog_closed_page{page_index}"
        # 既に表示済みかチェック
        if dialog_key not in st.session_state or not st.session_state[dialog_key]:
            self.show_guide_dialog(1)

    def render_page2(self):
        """ゴール設定ページの表示"""      
        st.title("Step2：探究学習の目標を決めよう！")
        
        # 現在のステップを表示
        self.make_sequence_bar()

        # 変数を関数の先頭で初期化
        user_theme_str = ""

        # このページでやることのガイドを表示（インデックス指定）
        page_index = 2;
        dialog_key = f"dialog_closed_page{page_index}"
        # 既に表示済みかチェック
        if dialog_key not in st.session_state or not st.session_state[dialog_key]:
            self.show_guide_dialog(2) 
        
        # 会話履歴の初期化（存在しない場合のみ）
        if 'dialogue_log' not in st.session_state:
            st.session_state.dialogue_log = []
            
            # 初期メッセージは会話履歴が空の時だけ追加する
            user_theme = self.db_manager.get_interest(user_id=st.session_state.user_id)
            if user_theme and len(user_theme) > 0:
                user_theme_str = user_theme[0][0]
                st.write(f"あなたの探究テーマ: {user_theme_str}")
                
                # セッション状態に保存して後で使えるようにする
                st.session_state.user_theme_str = user_theme_str
                
                # 初期メッセージを生成して対話履歴に追加
                ai_question = self.planner.generate_response(prompt=goal_prompt, user_input=user_theme_str)
                st.session_state.dialogue_log.append(("AI", ai_question))
            elif "user_theme" in st.session_state:
                user_theme_str = st.session_state.user_theme
                st.success("session_stateからテーマを取得しました。")
            else:
                st.warning("テーマが登録されていません。前の画面で登録してください。")
                return  # テーマがない場合は処理を中断
        else:
            # セッション状態から取得
            if 'user_theme_str' in st.session_state:
                user_theme_str = st.session_state.user_theme_str

        # 対話履歴の表示
        for sender, msg_content in st.session_state.dialogue_log:
            with st.chat_message("assistant" if sender == "AI" else "user"):
                st.write(msg_content)

        # 対話回数をカウント（AIの発言回数をカウント）
        ai_messages_count = sum(1 for sender, _ in st.session_state.dialogue_log if sender == "AI")
        user_messages_count = sum(1 for sender, _ in st.session_state.dialogue_log if sender == "user")
        # 対話回数が3回未満の場合のみ、入力フィールドを表示
        if user_messages_count < 3:
            # ユーザー入力
            user_message = st.chat_input("AIアシスタントからの質問に回答してください。")
            
            if user_message:  # ユーザーが何か入力した場合のみ実行
                # 対話履歴に追加
                st.session_state.dialogue_log.append(("user", user_message))
                
                # AIの応答を生成
                response = self.planner.generate_response(prompt=goal_prompt, user_input=user_message)
                
                # 対話履歴に追加
                st.session_state.dialogue_log.append(("AI", response))
                
                # 画面を再読み込みして最新の対話を表示
                st.rerun()
        else:
            # 対話が3回に達した場合のメッセージ
            st.success("目標設定のための対話が完了しました。「次へ」ボタンをクリックして次のステップに進みましょう。")
            
            # 最終目標を保存するテキストエリア
            if 'final_goal' not in st.session_state:
                st.session_state.final_goal = ""
            
            final_goal = st.text_area("学習目標を整理しましょう", st.session_state.final_goal)
            
            if final_goal != st.session_state.final_goal:
                st.session_state.final_goal = final_goal
                self.db_manager.save_goal(user_id=st.session_state.user_id, interest=user_theme_str, goal=final_goal)
                st.rerun()

        col1, col2 = st.columns(2)
        with col1:
            if st.button("前へ"):
                self.prev_page()
                st.rerun()
        with col2:
            if st.button("次へ"):
                # 目標がセットされていれば次のページへ
                if ai_messages_count >= 3 and 'final_goal' in st.session_state and st.session_state.final_goal:
                    self.next_page()
                    st.rerun()
                elif ai_messages_count < 3:
                    st.warning("まずは3回の対話を完了させてください。")
                else:
                    st.warning("最終的な学習目標を入力してください。")

    def render_page3(self):
        """アイディエーションページの表示"""
        st.title("Step3：アイディエーション ~探究学習の内容を決めよう！")
        
        # 現在のステップを表示
        self.make_sequence_bar()

        # このページでやることのガイドを表示（インデックス指定）       
        page_index = 3;
        dialog_key = f"dialog_closed_page{page_index}"
        # 既に表示済みかチェック
        if dialog_key not in st.session_state or not st.session_state[dialog_key]:
            self.show_guide_dialog(3)

        # 会話履歴の初期化（存在しない場合のみ）
        if 'dialogue_log_plan' not in st.session_state:
            st.session_state.dialogue_log_plan = []
            
            # 初期メッセージは会話履歴が空の時だけ追加する
            user_goal = self.db_manager.get_goal(user_id=st.session_state.user_id)
            if user_goal and len(user_goal) > 0:
                user_goal_str = user_goal[0][3]
                st.write(f"あなたの探究活動の目標: {user_goal_str}")
                
                # 初期メッセージを生成して対話履歴に追加
                ai_question = self.planner.generate_response(prompt=content_prompt, user_input=user_goal_str)
                st.session_state.dialogue_log_plan.append(("AI", ai_question))
            else:
                st.warning("テーマが登録されていません。前の画面で登録してください。")
                return  # テーマがない場合は処理を中断

        # 対話履歴の表示
        for sender, msg_content in st.session_state.dialogue_log_plan:
            with st.chat_message("assistant" if sender == "AI" else "user"):
                st.write(msg_content)

        # 対話回数をカウント（AIの発言回数をカウント）
        ai_messages_count = sum(1 for sender, _ in st.session_state.dialogue_log_plan if sender == "AI")
        user_messages_count = sum(1 for sender, _ in st.session_state.dialogue_log_plan if sender == "user")
        # 対話回数が3回未満の場合のみ、入力フィールドを表示
        if user_messages_count < 6:
            # ユーザー入力
            user_message = st.chat_input("あなたの回答を入力してください")
            
            if user_message:  # ユーザーが何か入力した場合のみ実行
                # 対話履歴に追加
                st.session_state.dialogue_log_plan.append(("user", user_message))
                
                # AIの応答を生成
                response = self.planner.generate_response(prompt=content_prompt, user_input=user_message)
                
                # 対話履歴に追加
                st.session_state.dialogue_log_plan.append(("AI", response))
                
                # 画面を再読み込みして最新の対話を表示
                st.rerun()
        else:
            # 対話が3回に達した場合のメッセージ
            st.success("活動内容を決める対話が完了しました。「次へ」ボタンをクリックして次のステップに進みましょう。")
            
            # 初期化：user_goal_str変数
            user_goal_str = ""
            user_goal = self.db_manager.get_goal(user_id=st.session_state.user_id)
            if user_goal and len(user_goal) > 0:
                user_goal_str = user_goal[0][3]  # goalカラムの位置に応じて調整
                
            # 学習計画を保存するテキストエリア
            if 'learning_plan' not in st.session_state:
                st.session_state.learning_plan = ""
            
            learning_plan = st.text_area("改めて活動内容を整理しましょう", st.session_state.learning_plan)
            
            if learning_plan != st.session_state.learning_plan:
                st.session_state.learning_plan = learning_plan
                if user_goal_str:  # user_goal_strが空でない場合のみ保存を実行
                    self.db_manager.save_learningPlans(user_id=st.session_state.user_id, goal=user_goal_str, nextStep=learning_plan)
                st.rerun()

        col1, col2 = st.columns(2)
        with col1:
            if st.button("前へ"):
                self.prev_page()
                st.rerun()
        with col2:
            if st.button("次へ"):
                # 学習計画がセットされていれば次のページへ
                if ai_messages_count >= 3 and 'learning_plan' in st.session_state and st.session_state.learning_plan:
                    self.next_page()
                    st.rerun()
                elif ai_messages_count < 3:
                    st.warning("まずは3回の対話を完了させてください。")
                else:
                    st.warning("活動内容を整理してください。")

    def render_page4(self):
        """最終ページ（まとめ）の表示"""      
        st.title("Step4：まとめ")
        
        # 現在のステップを表示
        self.make_sequence_bar()
        
        # このページでやることのガイドを表示（インデックス指定）  
        page_index = 4;
        dialog_key = f"dialog_closed_page{page_index}"
        # 既に表示済みかチェック
        if dialog_key not in st.session_state or not st.session_state[dialog_key]:
            self.show_guide_dialog(4)
        
        # ユーザーのこれまでの入力内容をまとめて表示
        user_theme = self.db_manager.get_interest(user_id=st.session_state.user_id)
        user_goal = self.db_manager.get_goal(user_id=st.session_state.user_id)
        user_plan = self.db_manager.get_learningsPlans(user_id=st.session_state.user_id)
        
        if user_theme and user_goal and user_plan:
            st.write("### 探究学習の内容")
            st.write(f"**テーマ**: {user_theme[0][0]}")
            st.write(f"**目標**: {user_goal[0][3]}")
            st.write(f"**活動内容**: {user_plan[0][3]}")
            
            st.write("### 次のステップ")
            st.write("探究学習の計画が完成しました。この計画に沿って、実際に探究活動を進めていきましょう。")
            st.write("定期的に進捗を振り返り、必要に応じて計画を見直すことも大切です。")
        else:
            st.warning("データが見つかりません。前のステップを完了してください。")

        if st.button("前へ"):
            self.prev_page()
            st.rerun()

    def render_login_page(self):
        """ログイン画面の表示"""
        st.title("探究学習アシスタント - ログイン")
        
        # タブを作成してログインと登録を分ける
        tab1, tab2 = st.tabs(["ログイン", "新規ユーザー登録"])
        
        # ログインタブ
        with tab1:
            username = st.text_input("ユーザー名", key="login_username")
            access_code = st.text_input("アクセスコード", type="password", key="login_password")
            
            if st.button("ログイン", key="login_button"):
                user_id = self.db_manager.verify_user(username, access_code)
                if user_id:
                    st.session_state.authenticated = True
                    st.session_state.user_id = user_id
                    st.session_state.username = username
                    st.success("ログインしました！")
                    st.rerun()
                else:
                    st.error("ユーザー名またはアクセスコードが正しくありません")
        
        # 新規ユーザー登録タブ
        with tab2:
            new_username = st.text_input("ユーザー名", key="reg_username")
            new_access_code = st.text_input("アクセスコード", type="password", key="reg_password")
            confirm_code = st.text_input("アクセスコード（確認）", type="password", key="confirm_password")
            
            if st.button("登録", key="register_button"):
                if new_access_code != confirm_code:
                    st.error("アクセスコードが一致しません")
                elif not new_username or not new_access_code:
                    st.error("ユーザー名とアクセスコードを入力してください")
                else:
                    success = self.db_manager.add_user(new_username, new_access_code)
                    if success:
                        st.success("ユーザー登録が完了しました。ログインしてください。")
                    else:
                        st.error("そのユーザー名は既に使用されています")

    def setup_sidebar(self):
        """サイドバーの設定"""
        if st.session_state.authenticated:
            with st.sidebar:
                st.write(f"ログイン中: {st.session_state.username}")
                if st.button("ログアウト"):
                    st.session_state.authenticated = False
                    st.session_state.user_id = None
                    st.session_state.username = None
                    # セッションクリア
                    for key in list(st.session_state.keys()):
                        if key not in ["authenticated", "user_id", "username"]:
                            del st.session_state[key]
                    st.rerun()

    def run(self):
        """アプリケーションの実行"""
        # サイドバーの設定
        self.setup_sidebar()
        
        # 認証状態の確認
        if not st.session_state.authenticated:
            self.render_login_page()
        else:
            # 認証済みならページを表示
            if st.session_state.page == 1:
                self.render_page1()
            elif st.session_state.page == 2:
                self.render_page2()
            elif st.session_state.page == 3:
                self.render_page3()
            elif st.session_state.page == 4:
                self.render_page4()

# アプリケーション実行
if __name__ == "__main__":
    app = StreamlitApp()
    app.run()