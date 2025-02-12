from db_manager import DBManager
from LLM.assistant import learning_assistant


def main():
    db = DBManager()
    assistant = learning_assistant()

    db.delete_table_logs()
    db.delete_table_advices()

    db.create_table_advices()
    db.create_table_logs()

    log_input = input("学習記録： ")

    db.save_log(log_input)
    print("\n=== 今日の学習記録 ===")
    print(log_input)

    advice = learning_assistant.get_advise(log_input)
    print("\n===アドバイス===")
    print(advice)

    db.save_advice(advice=advice)

    db.close()

if __name__ == "__main__":
    main()