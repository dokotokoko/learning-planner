from module.db_manager import DBManager
from module.llm_api import learning_plannner

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

    interest = input("探究のテーマを入力してください：")
    db.save_interests(interest=interest)

    goal = planner.make_goal_from_object(object=interest)
    user_goal = input("あなたの探究学習の目標： ")
    print("\n=== あなたの学習目標 ===")
    #content = planner.make_content_from_goal(goal=goal)

    user_interest = db.get_interest()
    object = planner.make_object_from_interest(user_goal)
    print("\n=== あなたの目的意識")
    print(object)
    db.save_goal(interest=interest, goal=object)

    plan = planner.make_learning_plan(goal=user_goal)

    print("\n=== 提案された学習計画 ===")
    print(plan)

    #DBに保存
    db.save_learningPlans(goal=goal, nextStep=plan)
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