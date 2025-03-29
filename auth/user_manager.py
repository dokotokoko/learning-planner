import sqlite3
from streamlit_authenticator.utilities.hasher import Hasher

class UserManager:
    def __init__(self, db_path):
        self.db_path = db_path
        self.hasher = Hasher()
        self._init_db()
    
    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        conn.commit()
        conn.close()
    
    def add_user(self, user_id, name, email, password):
        hashed_password = self.hasher.hash(password)
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)",
                (user_id, name, email, hashed_password)
            )
            conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False
        finally:
            conn.close()
    
    def get_credentials_dict(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, email, password FROM users")
        users = cursor.fetchall()
        conn.close()
        
        credentials = {"usernames": {}}
        for user_id, name, email, password in users:
            credentials["usernames"][user_id] = {
                "name": name,
                "email": email,
                "password": password
            }
        return credentials 