from module.db_manager import DBManager
from module.llm_api import learning_plannner


def main():
    db = DBManager()
    assistant = learning_plannner()

    db.delete_table_logs()
    db.delete_table_advices()

    db.create_table_advices()
    db.create_table_logs()

    log_input = input("今日の日報： ")

    db.save_log(log_input)
    print("\n=== 今日の日報 ===")
    print(log_input)

    advice = assistant.get_advise(log=log_input)
    print("\n=== アドバイス ===")
    print(advice)

    db.save_advice(advice=advice)

    db.close()

if __name__ == "__main__":
    main()