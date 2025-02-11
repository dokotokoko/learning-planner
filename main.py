from db_manager import DBManager
from LLM_manager import learning_plannner

def main():
    db = DBManager()

    #既存のテーブルを削除
    db.delete_table_learning_plans()
    db.delete_table_goals()
    db.delete_table_interests()

    #必要なテーブルを作成
    db.create_table_interests()
    db.create_table_goals()
    db.create_table_learningPlans()

    planner = learning_plannner()

    interest = input("学びたいことを入力してください：")
    db.save_interests(interest=interest)

    user_interest = db.get_interest()
    goal = planner.make_goal_from_interest(user_interest)
    db.save_goal(interest=interest, goal=goal)

    learning_plan = planner.make_learning_plan(goal=goal)

    print("\n=== 提案された学習計画 ===")
    print(learning_plan)

    #DBに保存
    db.save_learningPlans(goal=goal, nextStep=learning_plan)
    print("\n 学習計画を保存しました")

    interest_log = db.get_interest()
    print("\n=== あなたの興味関心 ===")
    print(interest_log)

    goal_log = db.get_goal()
    print("\n=== あなたの学習目標 ===")
    print(goal_log)

    plans = db.get_learningsPlans()
    print("\n=== 現在の学習計画 ===")
    print(plans)

    db.close()

if __name__ == "__main__":
    main()