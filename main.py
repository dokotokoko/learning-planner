from db_manager import DBManager
from learning_planner import learning_plannner

def main():
    db = DBManager()
    db.create_table_learningPlans()

    planner = learning_plannner()

    interest = input("学びたいことを入力してください：")
    learning_plan = planner.make_learning_plan(interest)

    print("\n=== 提案された学習計画 ===")
    print(learning_plan)

    #DBに保存
    db.save_learningPlans(interest,"目標未定", learning_plan)
    print("\n 学習計画を保存しました")

    plans = db.get_learningsPlans()
    print("\n=== 現在の学習計画 ===")
    print(plans)

    db.close()

if __name__ == "__main__":
    main()