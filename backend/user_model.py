import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("POSTGRES_URL")

def get_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def init_users_table():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            full_name VARCHAR(255),
            role VARCHAR(50) DEFAULT 'viewer',
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    cur.execute("""
        ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'viewer'
    """)
    conn.commit()
    cur.close()
    conn.close()
    print("Users table ready")

def create_user(email: str, hashed_password: str, full_name: str, role: str = 'viewer'):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT COUNT(*) as count FROM users")
        count = cur.fetchone()['count']
        if count == 0:
            role = 'admin'
        cur.execute(
            "INSERT INTO users (email, hashed_password, full_name, role) VALUES (%s, %s, %s, %s) RETURNING *",
            (email, hashed_password, full_name, role)
        )
        user = dict(cur.fetchone())
        conn.commit()
        return user
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        return None
    finally:
        cur.close()
        conn.close()

def get_user_by_email(email: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cur.fetchone()
    cur.close()
    conn.close()
    return dict(user) if user else None

def update_user_role(email: str, role: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE users SET role = %s WHERE email = %s RETURNING *",
        (role, email)
    )
    user = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    return dict(user) if user else None

def get_all_users():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, email, full_name, role, created_at FROM users ORDER BY created_at")
    users = [dict(u) for u in cur.fetchall()]
    cur.close()
    conn.close()
    return users
