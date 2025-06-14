import streamlit as st
from streamlit_chat import message
from st_supabase_connection import SupabaseConnection
import logging

from module.llm_api import learning_plannner
from prompt.prompt import system_prompt

# DBの設定
DB_FILE = "IBL-assistant.db"

# ロギング設定 (任意)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- 追加: 外部CSSファイルを読み込むヘルパー関数 ---   
def local_css(file_name):
    with open(file_name, encoding='utf-8') as f:
        st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)
# --- 追加ここまで ---

class StreamlitApp:
    def __init__(self):
        """アプリケーションの初期化"""
        self.planner = learning_plannner()
        self._initialize_session_state()
        # Supabase接続を初期化
        try:
            self.conn = st.connection("supabase", type=SupabaseConnection)
            logging.info("Supabase接続を初期化しました。")
            # Supabaseテーブルを初期化
            self._initialize_supabase_tables()
        except Exception as e:
            st.error(f"データベース接続またはテーブル初期化中にエラーが発生しました: {e}")
            logging.error(f"データベース接続/初期化エラー: {e}", exc_info=True)
            # エラーが発生した場合、アプリの続行が難しい可能性があるため停止
            st.stop()

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
        if "general_inquiry_history" not in st.session_state:
            st.session_state.general_inquiry_history = []
        if "is_initial_setup" not in st.session_state:
            st.session_state.is_initial_setup = False

    def _initialize_supabase_tables(self):
        """Supabaseに必要なテーブルが存在しない場合に作成する"""
        logging.info("Supabaseテーブルの初期化を試みます (注意: テーブルは事前に作成することを推奨)")

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
                1: """まずはあなたの興味・知的好奇心を教えてください！！。
                後からゴールや学習計画を設定する際の出発点となります。
                興味 = 探究学習のエネルギー
                
                例えば以下のような視点で考えてみましょう：
                - 社会問題や身近な疑問・課題
                - 将来の夢や目標に関連するテーマ
                - これまでに学んできた中で特に興味を持ったこと""",
                
                2: """この画面では、テーマを具体的な目標に落とし込みます。
                目標 = 方向性と目指すゴール
                
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

        theme = st.text_input("あなたが探究したいテーマを入力してください。例：AIによるメタ認知支援")

        if st.button("テーマを決定する"):
            if theme:
                try:
                    self.conn.table("interests").insert({"user_id": st.session_state.user_id, "interest": theme}).execute()
                    st.success(f"テーマ '{theme}' を保存しました！")
                    st.session_state.user_theme = theme
                except Exception as e:
                    st.error(f"テーマの保存に失敗: {str(e)}")
                    logging.error(f"テーマ保存エラー: {e}", exc_info=True)

        col1, col2 = st.columns(2)
        with col1:
            if st.button("ホームへ戻る", key="back_to_home_from_page1"):
                self.set_page("home")
                st.rerun()
        with col2:
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
            try:
                user_theme_result = self.conn.table("interests")\
                                          .select("interest")\
                                          .eq("user_id", st.session_state.user_id)\
                                          .order("created_at", desc=True)\
                                          .limit(1)\
                                          .execute()
                
                if user_theme_result.data:
                    user_theme_str = user_theme_result.data[0]['interest']
                    st.write(f"あなたの探究テーマ: {user_theme_str}")
                    
                    # セッション状態に保存して後で使えるようにする
                    st.session_state.user_theme_str = user_theme_str
                    
                    # 初期メッセージを生成して対話履歴に追加
                    ai_question = self.planner.generate_response(prompt=system_prompt, user_input=user_theme_str)
                    st.session_state.dialogue_log.append({"role": "assistant", "content": ai_question})
                else:
                    st.warning("テーマが登録されていません。前の画面で登録してください。")
                    if st.button("テーマ登録ページに戻る", key="back_to_page1_from_page2_for_theme"):
                        self.set_page(1)
                        st.rerun()
                    return  # テーマがない場合は処理を中断
            except Exception as e:
                 st.error(f"テーマの読み込みに失敗: {e}")
                 logging.error(f"テーマ読み込みエラー: {e}", exc_info=True)
                 return # 読み込み失敗時も中断
        else:
            # セッション状態から取得 (再描画時など)
            if 'user_theme_str' in st.session_state:
                user_theme_str = st.session_state.user_theme_str
            else:
                # 念のため、セッションにもなければDBから再取得試行
                try:
                    user_theme_result = self.conn.table("interests")\
                                              .select("interest")\
                                              .eq("user_id", st.session_state.user_id)\
                                              .order("created_at", desc=True)\
                                              .limit(1)\
                                              .execute()
                    if user_theme_result.data:
                        user_theme_str = user_theme_result.data[0]['interest']
                        st.session_state.user_theme_str = user_theme_str
                    else:
                        st.warning("テーマが見つかりません。Step1からやり直してください。")
                        if st.button("テーマ登録ページに戻る", key="back_to_page1_from_page2_for_theme_retry"):
                            self.set_page(1)
                            st.rerun()
                        # ここで st.stop() または return するかは要件次第
                except Exception as e:
                    st.error(f"テーマの再取得に失敗: {e}")
                    logging.error(f"テーマ再取得エラー: {e}", exc_info=True)

        # 対話履歴の表示
        for msg in st.session_state.dialogue_log:
            with st.chat_message(msg["role"]):
                st.write(msg["content"])

        # 対話回数をカウント（AIの発言回数をカウント）
        ai_messages_count = sum(1 for msg in st.session_state.dialogue_log if msg["role"] == "assistant")
        user_messages_count = sum(1 for msg in st.session_state.dialogue_log if msg["role"] == "user")
        # 対話回数が3回未満の場合のみ、入力フィールドを表示
        if user_messages_count < 3:
            # ユーザー入力
            user_message = st.chat_input("AIアシスタントからの質問に回答してください。", key="goal_input")
            
            if user_message:  # ユーザーが何か入力した場合のみ実行
                # --- ログ保存処理を追加 ---
                self.save_chat_log(page=2, sender="user", message_content=user_message)
                # --- 追加ここまで ---

                # 対話履歴に追加
                st.session_state.dialogue_log.append({"role": "user", "content": user_message})
                
                # AIの応答を生成
                response = self.planner.generate_response(prompt=system_prompt, user_input=user_message)
                
                # --- ログ保存処理を追加 ---
                self.save_chat_log(page=2, sender="AI", message_content=response)
                # --- 追加ここまで ---

                # 対話履歴に追加
                st.session_state.dialogue_log.append({"role": "assistant", "content": response})
                
                # 画面を再読み込みして最新の対話を表示
                st.rerun()
        else:
            # 対話が3回に達した場合のメッセージ
            st.success("目標設定のための対話が完了しました。最後に目標を入力した後に「次へ」ボタンをクリックして次のステップに進みましょう。")
            
            # 最終目標を保存するテキストエリア
            if 'final_goal' not in st.session_state:
                st.session_state.final_goal = "" # 初期化
                # 過去のデータがあれば読み込む
                try:
                    goal_result = self.conn.table("goals")\
                                        .select("goal")\
                                        .eq("user_id", st.session_state.user_id)\
                                        .order("created_at", desc=True)\
                                        .limit(1)\
                                        .execute()
                    if goal_result.data:
                        st.session_state.final_goal = goal_result.data[0]['goal']
                except Exception as e:
                    logging.warning(f"過去のゴールの読み込みに失敗: {e}")
            
            final_goal_input = st.text_area("学習目標を整理しましょう", value=st.session_state.final_goal, key="final_goal_text_area")
            
            # テキストエリアの内容が変更されたらDBに保存
            if final_goal_input != st.session_state.final_goal:
                st.session_state.final_goal = final_goal_input
                # --- DB操作の変更 --- 
                try:
                    # 対応するinterest_idを取得
                    interest_id = None
                    if 'user_theme_str' in st.session_state:
                        interest_result = self.conn.table("interests")\
                                                  .select("id")\
                                                  .eq("user_id", st.session_state.user_id)\
                                                  .eq("interest", st.session_state.user_theme_str)\
                                                  .order("created_at", desc=True)\
                                                  .limit(1)\
                                                  .execute()
                        if interest_result.data:
                            interest_id = interest_result.data[0]['id']
                        else:
                            st.warning(f"テーマ '{st.session_state.user_theme_str}' のIDが見つかりません。先にテーマを保存してください。")
                            # interest_id がなければ goals に保存できないため return か、interest_idなしで保存するか検討
                            # return # ここでは保存を中止
                    else:
                        st.warning("テーマ情報がセッションにありません。Goalを保存できませんでした。")
                        # return
                    
                    if interest_id:
                        # self.db_manager.save_goal(st.session_state.user_id, st.session_state.user_theme_str, final_goal_input)
                        # 既存のゴールがあれば更新、なければ挿入 (upsert) または Insert のみ
                        # ここでは単純にInsert（同じユーザーIDで複数のゴールを持てる仕様とする）
                        self.conn.table("goals").insert({
                            "user_id": st.session_state.user_id,
                            "interest_id": interest_id,
                            "goal": final_goal_input
                        }).execute()
                        st.success("学習目標を保存しました。")
                        st.rerun() # 保存後に再実行して表示を更新
                    else:
                         st.error("関連するテーマが見つからなかったため、目標を保存できませんでした。")

                except Exception as e:
                     st.error(f"学習目標の保存に失敗: {e}")
                     logging.error(f"ゴール保存エラー: {e}", exc_info=True)
                # --- 変更ここまで --- 

        col1, col2 = st.columns(2)
        with col1:
            if st.button("前へ"):
                self.prev_page()
                st.rerun()
        with col2:
            if st.button("次へ"):
                # 目標がセットされていれば次のページへ
                if user_messages_count >= 3 and 'final_goal' in st.session_state and st.session_state.final_goal:
                    self.next_page()
                    st.rerun()
                elif user_messages_count < 3:
                    st.warning("まずは3回の対話を完了させてください。")
                else:
                    st.warning("最終的な学習目標を入力してください。")

    def render_page3(self):
        """アイディエーションページの表示"""
        st.title("Step3：アイディエーション ~探究学習の活動内容を決めよう！")
        
        # 現在のステップを表示
        self.make_sequence_bar()

        # このページでやることのガイドを表示（インデックス指定）       
        page_index = 3;
        dialog_key = f"dialog_closed_page{page_index}"
        # 既に表示済みかチェック
        if dialog_key not in st.session_state or not st.session_state[dialog_key]:
            self.show_guide_dialog(3)

        # --- DB操作の変更 (ゴールの取得) ---
        user_goal_str = ""
        try:
            goal_result = self.conn.table("goals")\
                              .select("goal")\
                              .eq("user_id", st.session_state.user_id)\
                              .order("created_at", desc=True)\
                              .limit(1)\
                              .execute()
            if goal_result.data:
                user_goal_str = goal_result.data[0]['goal']
                st.session_state.user_goal_str = user_goal_str # セッションにも保存
                st.write(f"あなたの探究活動の目標: {user_goal_str}")
            elif 'final_goal' in st.session_state: # DBになくてもセッションにあれば使う
                 user_goal_str = st.session_state.final_goal
                 st.write(f"あなたの探究活動の目標 (セッションから): {user_goal_str}")
            else:
                st.warning("目標が登録されていません。前の画面で登録してください。")
                # return ここで止めると以降の処理ができない
        except Exception as e:
            st.error(f"目標の読み込みに失敗: {e}")
            logging.error(f"目標読み込みエラー: {e}", exc_info=True)
            # return
        # --- 変更ここまで ---

        # 会話履歴の初期化（存在しない場合のみ）
        if 'dialogue_log_plan' not in st.session_state:
            st.session_state.dialogue_log_plan = []
            
            # 初期メッセージは会話履歴が空の時だけ追加する (目標が取得できていれば)
            if user_goal_str:
                ai_question = self.planner.generate_response(prompt=system_prompt, user_input=user_goal_str)
                st.session_state.dialogue_log_plan.append({"role": "assistant", "content": ai_question})
            # else: # 目標がない場合は初期質問をスキップ（あるいは別のメッセージ）
            #     st.info("目標を設定してから、活動内容の相談を開始します。")

        # 対話履歴の表示
        for msg in st.session_state.dialogue_log_plan:
            with st.chat_message(msg["role"]):
                st.write(msg["content"])

        # 対話回数をカウント（AIの発言回数をカウント）
        ai_messages_count = sum(1 for msg in st.session_state.dialogue_log_plan if msg["role"] == "assistant")
        user_messages_count = sum(1 for msg in st.session_state.dialogue_log_plan if msg["role"] == "user")
        # 対話回数が6回未満の場合のみ、入力フィールドを表示
        if user_messages_count < 3:
            # ユーザー入力
            user_message = st.chat_input("あなたの回答を入力してください", key="plan_input")
            
            if user_message:  # ユーザーが何か入力した場合のみ実行
                # --- ログ保存処理を追加 ---
                self.save_chat_log(page=3, sender="user", message_content=user_message)
                # --- 追加ここまで ---

                # 対話履歴に追加
                st.session_state.dialogue_log_plan.append({"role": "user", "content": user_message})
                
                # AIの応答を生成
                response = self.planner.generate_response(prompt=system_prompt, user_input=user_message)
                
                # --- ログ保存処理を追加 ---
                self.save_chat_log(page=3, sender="AI", message_content=response)
                # --- 追加ここまで ---

                # 対話履歴に追加
                st.session_state.dialogue_log_plan.append({"role": "assistant", "content": response})
                
                # 画面を再読み込みして最新の対話を表示
                st.rerun()
        else:
            # 対話が完了した場合のメッセージ
            st.success("活動内容を決める対話が完了しました。「次へ」ボタンをクリックして次のステップに進みましょう。")
            
            # 学習計画を保存するテキストエリア
            if 'learning_plan' not in st.session_state:
                st.session_state.learning_plan = "" # 初期化
                 # 過去のデータがあれば読み込む
                try:
                    plan_result = self.conn.table("learning_plans")\
                                        .select("nextStep")\
                                        .eq("user_id", st.session_state.user_id)\
                                        .order("created_at", desc=True)\
                                        .limit(1)\
                                        .execute()
                    if plan_result.data:
                        st.session_state.learning_plan = plan_result.data[0]['nextStep']
                except Exception as e:
                    logging.warning(f"過去の学習計画の読み込みに失敗: {e}")
            
            learning_plan_input = st.text_area("改めて活動内容を整理しましょう", value=st.session_state.learning_plan, key="learning_plan_text_area")
            
            if learning_plan_input != st.session_state.learning_plan:
                st.session_state.learning_plan = learning_plan_input
                 # --- DB操作の変更 --- 
                try:
                    # 対応する goal_id を取得 (user_goal_str を使う)
                    goal_id = None
                    current_goal_str = st.session_state.get('user_goal_str') # セッションから最新のゴール文字列を取得
                    if current_goal_str:
                         goal_result = self.conn.table("goals")\
                                           .select("id")\
                                           .eq("user_id", st.session_state.user_id)\
                                           .eq("goal", current_goal_str)\
                                           .order("created_at", desc=True)\
                                           .limit(1)\
                                           .execute()
                         if goal_result.data:
                             goal_id = goal_result.data[0]['id']
                         else:
                             st.warning(f"目標 '{current_goal_str}' のIDが見つかりません。先に目標を保存してください。")
                    else:
                         st.warning("目標情報がセッションにありません。活動計画を保存できませんでした。")

                    if goal_id:
                        # self.db_manager.save_learningPlans(st.session_state.user_id, user_goal_str, learning_plan_input)
                        # Insert or Upsert
                        self.conn.table("learning_plans").insert({
                            "user_id": st.session_state.user_id,
                            "goal_id": goal_id,
                            "nextStep": learning_plan_input
                        }).execute()
                        st.success("活動計画を保存しました。")
                        st.rerun()
                    else:
                         st.error("関連する目標が見つからなかったため、活動計画を保存できませんでした。")
                except Exception as e:
                     st.error(f"活動計画の保存に失敗: {e}")
                     logging.error(f"活動計画保存エラー: {e}", exc_info=True)
                # --- 変更ここまで --- 

        col1, col2 = st.columns(2)
        with col1:
            if st.button("前へ"):
                self.prev_page()
                st.rerun()
        with col2:
            if st.button("次へ"):
                # 学習計画がセットされていれば次のページへ
                if user_messages_count >= 6 and 'learning_plan' in st.session_state and st.session_state.learning_plan:
                    self.next_page()
                    st.rerun()
                elif user_messages_count < 6:
                    st.warning("まずは対話を完了させてください。")
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
        
        # --- DB操作の変更 (データの取得) --- 
        theme_str = "データなし"
        goal_str = "データなし"
        plan_str = "データなし"
        try:
            user_theme_result = self.conn.table("interests")\
                                      .select("interest")\
                                      .eq("user_id", st.session_state.user_id)\
                                      .order("created_at", desc=True).limit(1).execute()
            user_goal_result = self.conn.table("goals")\
                                     .select("goal")\
                                     .eq("user_id", st.session_state.user_id)\
                                     .order("created_at", desc=True).limit(1).execute()
            user_plan_result = self.conn.table("learning_plans")\
                                     .select("nextStep")\
                                     .eq("user_id", st.session_state.user_id)\
                                     .order("created_at", desc=True).limit(1).execute()

            if user_theme_result.data:
                theme_str = user_theme_result.data[0]['interest']
            if user_goal_result.data:
                goal_str = user_goal_result.data[0]['goal']
            if user_plan_result.data:
                plan_str = user_plan_result.data[0]['nextStep']

            st.write("### 探究学習の内容")
            st.write(f"**テーマ**: {theme_str}")
            st.write(f"**目標**: {goal_str}")
            st.write(f"**活動内容**: {plan_str}")
            
            st.write("### 次のステップ")
            st.write("探究学習の計画が完成しました。この計画に沿って、実際に探究活動を進めていきましょう。")
            st.write("定期的に進捗を振り返り、必要に応じて計画を見直すことも大切です。")

        except Exception as e:
             st.error(f"データの読み込み中にエラーが発生しました: {e}")
             logging.error(f"まとめページデータ読み込みエラー: {e}", exc_info=True)
             st.warning("データが完全に読み込めませんでした。前のステップに戻って確認してください。")
        # --- 変更ここまで --- 

        if st.button("前へ"):
            self.prev_page()
            st.rerun()

    def render_login_page(self):
        """ログイン画面の表示"""
        st.title("探Qメイト - ログイン")
        st.write("AIを活用した探究学習支援アプリケーションです。探究テーマから学習目標の設定、学習計画の作成までを対話形式でサポートします。")
        
        tab1, tab2 = st.tabs(["ログイン", "新規ユーザー登録"])
        
        # ログインタブ
        with tab1:
            username = st.text_input("ユーザー名", key="login_username")
            access_code = st.text_input("パスワード", type="password", key="login_password")

            st.markdown(
                """
                <style>
                .stButton button {
                    font-size: 16px;
                    font-weight: bold; /* Bold text */
                    color: #FFFFFF;
                    background-color: #0e3558; /* Dark blue color */
                    border: none;
                    border-radius: 25px; /* Rounded corners */
                    padding: 10px 20px;
                    cursor: pointer;
                    transition: background-color 0.3s ease, transform 0.3s ease;
                }
                .stButton button:hover {
                    background-color: #47d7ac; /* Green background on hover */
                    color: #FFFFFF; /* Keep text white on hover */
                    transform: scale(1.05); /* Slightly enlarge on hover */
                }
                </style>
                """,
                unsafe_allow_html=True,
            )
            
            if st.button("ログイン", key="login_button"):
                try:
                    # Supabaseからユーザーを検索
                    # TODO: access_codeはハッシュ化して比較するべき
                    result = self.conn.table("users").select("id").eq("username", username).eq("password", access_code).execute()
                    if result.data:
                        user_id = result.data[0]["id"]
                        st.session_state.authenticated = True
                        st.session_state.user_id = user_id
                        st.session_state.username = username
                        st.session_state.page = "home" # ログイン後ホームページへ
                        st.success("ログインしました！")
                        st.rerun()
                    else:
                        st.error("ユーザー名またはパスワードが正しくありません")
                        user_id = None
                except Exception as e:
                    st.error(f"ログイン処理中にエラーが発生しました: {e}")
                    logging.error(f"ログインエラー: {e}", exc_info=True)
        
        # 新規ユーザー登録タブ
        with tab2:
            new_username = st.text_input("ユーザー名", key="reg_username")
            new_access_code = st.text_input("パスワード", type="password", key="reg_password")
            confirm_code = st.text_input("パスワード（確認）", type="password", key="confirm_password")
            
            if st.button("登録", key="register_button"):
                if new_access_code != confirm_code:
                    st.error("パスワードが一致しません")
                elif not new_username or not new_access_code:
                    st.error("ユーザー名とパスワードを入力してください")
                else:
                    try:
                        # Supabaseにユーザーを挿入
                        # TODO: new_access_code はハッシュ化して保存するべき
                        insert_data = {"username": new_username, "password": new_access_code}
                        result = self.conn.table("users").insert(insert_data).execute()
                        if result.data:
                            # 登録成功後、自動的にログインしてプロフィール設定に遷移
                            user_id = result.data[0]["id"]
                            st.session_state.authenticated = True
                            st.session_state.user_id = user_id
                            st.session_state.username = new_username
                            st.session_state.is_initial_setup = True
                            st.session_state.page = "profile"
                            st.success("ユーザー登録が完了しました。プロフィール設定を続けてください。")
                            st.rerun()
                        else:
                            st.error("ユーザー登録に失敗しました")
                    except Exception as e:
                        # PostgRESTエラーを解析して重複を判定することも可能
                        if "duplicate key value violates unique constraint" in str(e):
                             st.error("そのユーザー名は既に使用されています")
                        else:
                             st.error(f"ユーザー登録中にエラーが発生しました: {e}")
                        logging.error(f"ユーザー登録エラー: {e}", exc_info=True)

    def setup_sidebar(self):
        """サイドバーの設定"""
        if st.session_state.authenticated:
            with st.sidebar:
                st.write(f"ログイン中: {st.session_state.username}")
                st.button("👤 プロフィール設定", on_click=self.navigate_to_profile, key="sidebar_nav_profile", use_container_width=True)
                st.divider()

                if st.session_state.page == "home":
                    st.button("❓ 行き詰ってたらここにおいで！", on_click=self.navigate_to_general_inquiry, key="sidebar_nav_general_inquiry_home", use_container_width=True)
                else:
                    st.button("🏠 ホームへ戻る", on_click=self.navigate_to_home, key="sidebar_nav_home", use_container_width=True)
                    st.divider()
                    st.button("1️⃣ Step 1: テーマ設定", on_click=self.navigate_to_page1, key="sidebar_nav_p1", use_container_width=True)
                    st.button("2️⃣ Step 2: ゴール設定", on_click=self.navigate_to_page2, key="sidebar_nav_p2", use_container_width=True)
                    st.button("3️⃣ Step 3: アイディエーション", on_click=self.navigate_to_page3, key="sidebar_nav_p3", use_container_width=True)
                    st.button("4️⃣ Step 4: まとめ", on_click=self.navigate_to_page4, key="sidebar_nav_p4", use_container_width=True)
                    st.divider()
                    st.button("❓ 行き詰ってたらここにおいで！", on_click=self.navigate_to_general_inquiry, key="sidebar_nav_general_inquiry_other", use_container_width=True)
                
                st.divider()
                if st.button("ログアウト", key="sidebar_logout", use_container_width=True):
                    # ログアウト処理
                    st.session_state.authenticated = False
                    st.session_state.user_id = None
                    st.session_state.username = None
                    # 他のセッション状態もクリア
                    keys_to_keep = {"authenticated", "user_id", "username"}
                    for key in list(st.session_state.keys()):
                        if key not in keys_to_keep:
                            del st.session_state[key]
                    st.rerun()

    def set_page(self, page_value):
        """ページを設定するヘルパー関数"""
        st.session_state.page = page_value
        # 相談窓口やホームページ以外から移動する場合は履歴をクリア（必要に応じて調整）
        if page_value not in ["general_inquiry", "home"]:
            if "general_inquiry_history" in st.session_state:
                 st.session_state.general_inquiry_history = []
        # elif page_value == "home": # ホームに移動したときに相談履歴をクリアする場合
        #     if "general_inquiry_history" in st.session_state:
        #          st.session_state.general_inquiry_history = []

    def run(self):
        """アプリケーションの実行"""
        # --- 追加: CSSファイルの読み込み ---
        local_css("static/style.css") 
        # --- 追加ここまで ---

        # サイドバーの設定
        self.setup_sidebar()
        
        # 認証状態の確認
        if not st.session_state.authenticated:
            self.render_login_page()
        else:
            # 認証済みならページを表示
            if st.session_state.page == "home":
                self.render_home_page()
            elif st.session_state.page == "profile":
                self.render_profile_page()
            elif st.session_state.page == 1:
                self.render_page1()
            elif st.session_state.page == 2:
                self.render_page2()
            elif st.session_state.page == 3:
                self.render_page3()
            elif st.session_state.page == 4:
                self.render_page4()
            elif st.session_state.page == 5:
                self.render_general_inquiry_page()

    # --- ヘルパーメソッドを追加 ---
    def save_chat_log(self, page: int, sender: str, message_content: str):
        """対話ログをSupabaseに保存する"""
        try:
            self.conn.table("chat_logs").insert({
                "user_id": st.session_state.user_id,
                "page": str(page), # ページ番号が文字列の場合も考慮してstr()でキャスト
                "sender": sender,
                "message": message_content
            }).execute()
            logging.info(f"対話ログ保存成功: Page={page}, Sender={sender}")
        except Exception as e:
            st.error(f"対話ログの保存に失敗しました: {e}")
            logging.error(f"対話ログ保存エラー: Page={page}, Sender={sender}, Error={e}", exc_info=True)

    def load_user_profile(self):
        """ユーザーのプロフィール情報をロードする"""
        try:
            result = self.conn.table("user_profiles")\
                        .select("profile_data")\
                        .eq("user_id", st.session_state.user_id)\
                        .execute()
            if result.data:
                profile_data = result.data[0]['profile_data']
                return {
                    "likes": profile_data.get("likes", []),
                    "interests": profile_data.get("interests", []),
                    "wants_to_try": profile_data.get("wants_to_try", [])
                }
            else:
                return {"likes": [], "interests": [], "wants_to_try": []}
        except Exception as e:
            logging.error(f"プロフィール読み込みエラー: {e}", exc_info=True)
            return {"likes": [], "interests": [], "wants_to_try": []}

    def save_user_profile(self, likes: list, interests: list, wants_to_try: list):
        """ユーザーのプロフィール情報を保存する（JSON形式）"""
        try:
            # プロフィールが既に存在するかチェック
            existing = self.conn.table("user_profiles")\
                        .select("id")\
                        .eq("user_id", st.session_state.user_id)\
                        .execute()
            
            profile_data = {
                "likes": likes,
                "interests": interests,
                "wants_to_try": wants_to_try
            }
            
            if existing.data:
                # 既存のプロフィールを更新
                result = self.conn.table("user_profiles")\
                          .update({"profile_data": profile_data})\
                          .eq("user_id", st.session_state.user_id)\
                          .execute()
            else:
                # 新規プロフィールを作成
                insert_data = {
                    "user_id": st.session_state.user_id,
                    "profile_data": profile_data
                }
                result = self.conn.table("user_profiles")\
                          .insert(insert_data)\
                          .execute()
            
            return True
        except Exception as e:
            logging.error(f"プロフィール保存エラー: {e}", exc_info=True)
            return False

    def render_tag_input(self, label: str, items: list, key: str, placeholder: str = "", help_text: str = ""):
        """動的タグ入力ウィジェットをレンダリング（編集モード付き）"""
        st.write(f"**{label}**")
        if help_text:
            st.caption(help_text)
        
        # 編集モードの状態管理
        edit_mode_key = f"edit_mode_{key}"
        if edit_mode_key not in st.session_state:
            st.session_state[edit_mode_key] = False
        
        # 2カラムレイアウト
        col1, col2 = st.columns([1, 1])
        
        with col1:            
            # 新しいタグ追加用の入力フィールド
            new_item = st.text_input(
                "項目名を入力",
                key=f"new_{key}",
                placeholder=placeholder,
                label_visibility="collapsed"
            )
            
            # 追加ボタンを入力欄の直下に配置
            if st.button("➕ 追加", key=f"add_{key}", disabled=not new_item.strip(), use_container_width=True):
                if new_item.strip():
                    if new_item.strip() not in items:
                        items.append(new_item.strip())
                        st.success(f"✅ '{new_item.strip()}'を追加しました！")
                        st.rerun()
                    else:
                        st.warning("⚠️ 既に存在しています")
            
            # 一括追加機能
            with st.expander("📝 一括追加"):
                bulk_input = st.text_area(
                    "カンマ区切りで入力",
                    key=f"bulk_{key}",
                    placeholder="例: 音楽, 映画, 読書",
                    help="カンマ(,)で区切って複数項目を追加",
                    height=80
                )
                if st.button("一括追加", key=f"bulk_add_{key}", use_container_width=True):
                    if bulk_input.strip():
                        new_items = [item.strip() for item in bulk_input.split(",") if item.strip()]
                        added_count = 0
                        for item in new_items:
                            if item and item not in items:
                                items.append(item)
                                added_count += 1
                        
                        if added_count > 0:
                            st.success(f"✅ {added_count}個追加しました！")
                            st.rerun()
                        else:
                            st.info("ℹ️ 新しい項目はありませんでした")
        
        with col2:
            if items:
                # 登録数と編集ボタン
                col2_header1, col2_header2 = st.columns([2, 1])
                # タグ一覧の表示
                for i, item in enumerate(items):
                    if st.session_state[edit_mode_key]:
                        # 編集モード: 削除ボタン付きで表示
                        tag_col1, tag_col2 = st.columns([4, 1])
                        with tag_col1:
                            st.write(f"🏷️ {item}")
                        with tag_col2:
                            if st.button("✕", key=f"delete_{key}_{i}_{item}", help=f"'{item}'を削除"):
                                items.remove(item)
                                st.success(f"🗑️ '{item}'を削除しました")
                                st.rerun()
                    else:
                        # 表示モード: 削除ボタンなし
                        st.write(f"🏷️ {item}")

                # 編集モードの切り替えボタン
                if st.session_state[edit_mode_key]:
                    if st.button("✅ 完了", key=f"finish_edit_{key}", use_container_width=True):
                        st.session_state[edit_mode_key] = False
                        st.success("📝 編集を完了しました")
                        st.rerun()
                else:
                    if st.button("✏️ 編集", key=f"start_edit_{key}", use_container_width=True):
                        st.session_state[edit_mode_key] = True
                        st.info("💡 各タグの✕ボタンで削除できます")
                        st.rerun()             

                # 編集モード中の追加操作
                if st.session_state[edit_mode_key]:
                    st.divider()
                    col2_action1, col2_action2 = st.columns(2)
                    with col2_action1:
                        if st.button("🔄 並び替え", key=f"sort_{key}", use_container_width=True):
                            items.sort()
                            st.success("🔄 アルファベット順に並び替えました")
                            st.rerun()
                    with col2_action2:
                        if st.button("🗑️ 全削除", key=f"clear_all_{key}", use_container_width=True):
                            if st.session_state.get(f"confirm_clear_{key}", False):
                                items.clear()
                                st.session_state[edit_mode_key] = False
                                st.success("🗑️ 全て削除しました")
                                st.rerun()
                            else:
                                st.session_state[f"confirm_clear_{key}"] = True
                                st.warning("⚠️ もう一度押すと全削除されます")
                                st.rerun()
                    
                    # 確認状態をリセット（他のボタンが押された場合）
                    if f"confirm_clear_{key}" in st.session_state and st.session_state[f"confirm_clear_{key}"] == True:
                        # 少し待ってから確認状態をリセット
                        import time
                        time.sleep(0.1)
                        if st.session_state.get(f"confirm_clear_{key}", False):
                            st.session_state[f"confirm_clear_{key}"] = False
            else:
                st.info("📝 まだタグが追加されていません")
                st.caption("👈 左側の入力欄からタグを追加してください")
        
        return items

    def render_general_inquiry_page(self):
        """なんでも相談窓口ページの表示"""
        st.title("行き詰ってたらここにおいで！")
        st.write("探究学習を進める上で困っていること、悩んでいることを自由に入力してください。AIアシスタントが相談に乗ります。")

        # 「よくある困りごと」ボタンの例 (後で具体的な選択肢を追加)
        common_issues = [
            "何から始めたらいいかわからない",
            "テーマが大きすぎる気がする",
            "具体的な進め方がわからない",
            "行き詰まってしまった",
            "自分の探究テーマや問いの解像度を上げたい"
        ]
        
        # general_inquiry_historyが存在しない場合は初期化
        if 'general_inquiry_history' not in st.session_state:
            st.session_state.general_inquiry_history = []
        
        # selectbox のキーを修正し、コールバック関数または st.form を使った制御を検討
        # ここではシンプルに、選択肢が変更されたらそれを表示する形にする
        
        # ユーザーが選択した共通の問題を処理するための列
        col1, col2 = st.columns([3,1])
        with col1:
            selected_issue = st.selectbox(
                "もしかして、こういうことで困っていますか？", 
                options=["選択してください"] + common_issues, 
                key="common_issue_selector"
            )
        with col2:
            st.write("") # レイアウト調整用
            st.write("") # レイアウト調整用
            if selected_issue != "選択してください":
                if st.button("これで相談", key="common_issue_submit_button"):
                    st.session_state.general_inquiry_history.append({"role": "user", "content": selected_issue})
                    ai_response, st.session_state.general_inquiry_history = self.planner.handle_general_inquiry(
                        selected_issue, 
                        st.session_state.general_inquiry_history
                    )
                    self.save_chat_log(page=5, sender="user", message_content=selected_issue)
                    self.save_chat_log(page=5, sender="AI", message_content=ai_response)
                    # selectboxをリセットするためにキーを変更するか、st.formを使うことを検討
                    # ここではシンプルにrerun
                    st.rerun()

        # 対話履歴の表示
        chat_container = st.container()
        with chat_container:
            for msg in st.session_state.general_inquiry_history:
                with st.chat_message(msg["role"]):
                    st.write(msg["content"])

        user_input = st.chat_input("相談内容を入力してください...", key="general_inquiry_input")

        if user_input:
                # --- ログ保存処理を追加 ---
                self.save_chat_log(page=5, sender="user", message_content=user_input)
                # --- 追加ここまで ---

                # 対話履歴に追加
                st.session_state.general_inquiry_history.append({"role": "user", "content": user_input})
                
                # AIの応答を生成
                response = self.planner.generate_response(prompt=system_prompt, user_input=user_input)
                
                # --- ログ保存処理を追加 ---
                self.save_chat_log(page=5, sender="AI", message_content=response)
                # --- 追加ここまで ---

                # 対話履歴に追加
                st.session_state.general_inquiry_history.append({"role": "assistant", "content": response})
                
                # 画面を再読み込みして最新の対話を表示
                st.rerun()
        
        st.divider()
        if st.button("ステップ選択に戻る", key="back_to_steps_from_general_inquiry"):
            self.set_page(1) # set_page を使う
            st.rerun()
        if st.button("ホームページに戻る", key="back_to_home_from_general_inquiry"):
            self.set_page("home")
            st.rerun()

    def render_home_page(self):
        """ホームページの表示"""
        st.title(f"ようこそ、{st.session_state.username}さん！")
        st.write("どちらの機能を利用しますか？")

        col1, col2 = st.columns(2)
        with col1:
            if st.button("課題設定プロセスを開始する", key="start_process_button"):
                self.set_page(1) # ステップ1へ
                st.rerun()
        with col2:
            if st.button("行き詰ってたらここにおいで！", key="goto_general_inquiry_button"):
                self.set_page(5)
                st.rerun()

    def navigate_to_home(self):
        self.set_page("home")

    def navigate_to_page1(self):
        self.set_page(1)

    def navigate_to_page2(self):
        self.set_page(2)

    def navigate_to_page3(self):
        self.set_page(3)

    def navigate_to_page4(self):
        self.set_page(4)

    def navigate_to_general_inquiry(self):
        self.set_page(5)

    def navigate_to_profile(self):
        self.set_page("profile")

    def render_profile_page(self):
        """プロフィール設定ページの表示（タグ入力版）"""
        if st.session_state.get("is_initial_setup", False):
            st.title("🎉 ようこそ！プロフィール設定をしましょう")
            st.write("あなたの好きなことや興味関心を教えてください。これらの情報は、あなた専用の探究学習プランを作成する際に活用されます。")
            st.info("💡 項目は個数制限なく追加できます。後からいつでも変更可能です！")
        else:
            st.title("👤 プロフィール設定")
            st.write("あなたの好きなことや興味関心を編集できます。項目の追加・削除は自由自在です！")

        # 既存のプロフィール情報をロード
        profile_data = self.load_user_profile()
        
        # セッション状態でプロフィールデータを管理（編集中の一時保存）
        if 'temp_profile_data' not in st.session_state:
            st.session_state.temp_profile_data = {
                "likes": profile_data.get("likes", []).copy(),
                "interests": profile_data.get("interests", []).copy(), 
                "wants_to_try": profile_data.get("wants_to_try", []).copy()
            }

        st.divider()
        

        st.session_state.temp_profile_data["likes"] = self.render_tag_input(
            label="💝 My Tags",
            items=st.session_state.temp_profile_data["likes"],
            key="likes",
            placeholder="あなたが好きなこと、趣味、興味があることを追加してください"
        )

        # 保存ボタン
        col1, col2, col3 = st.columns([1, 2, 1])
        with col2:
            if st.button("💾 プロフィールを保存", key="save_profile", use_container_width=True, type="primary"):
                # 少なくとも1つの項目が入力されているかチェック
                total_items = (len(st.session_state.temp_profile_data["likes"]) + 
                             len(st.session_state.temp_profile_data["interests"]) + 
                             len(st.session_state.temp_profile_data["wants_to_try"]))
                
                if total_items > 0:
                    if self.save_user_profile(
                        st.session_state.temp_profile_data["likes"],
                        st.session_state.temp_profile_data["interests"],
                        st.session_state.temp_profile_data["wants_to_try"]
                    ):
                        st.success("✅ プロフィールを保存しました！")
                        # 一時保存データをクリア
                        if 'temp_profile_data' in st.session_state:
                            del st.session_state.temp_profile_data
                        
                        # 初回設定完了の場合
                        if st.session_state.get("is_initial_setup", False):
                            st.session_state.is_initial_setup = False
                            st.balloons()  # 🎈 お祝いアニメーション
                            st.info("🚀 プロフィール設定が完了しました！それでは探究学習を始めましょう。")
                            # 少し待ってからホームページにリダイレクト
                            import time
                            time.sleep(2)
                            self.set_page("home")
                            st.rerun()
                    else:
                        st.error("❌ プロフィールの保存に失敗しました。もう一度お試しください。")
                else:
                    st.warning("⚠️ 少なくとも1つの項目は追加してください。")

        # ナビゲーションボタン
        st.divider()
        col1, col2, col3 = st.columns(3)
        
        with col1:
            if not st.session_state.get("is_initial_setup", False):
                if st.button("🏠 ホームへ戻る", key="profile_to_home"):
                    # 一時保存データをクリア
                    if 'temp_profile_data' in st.session_state:
                        del st.session_state.temp_profile_data
                    self.set_page("home")
                    st.rerun()
        
        with col2:
            if st.button("🔄 リセット", key="reset_profile", help="編集内容を元に戻します"):
                if 'temp_profile_data' in st.session_state:
                    del st.session_state.temp_profile_data
                st.rerun()
        
        with col3:
            if st.session_state.get("is_initial_setup", False):
                if st.button("⏩ 後で設定する", key="skip_profile_setup"):
                    st.session_state.is_initial_setup = False
                    # 一時保存データをクリア
                    if 'temp_profile_data' in st.session_state:
                        del st.session_state.temp_profile_data
                    self.set_page("home")
                    st.rerun()


# アプリケーション実行
if __name__ == "__main__":
    app = StreamlitApp()
    app.run()