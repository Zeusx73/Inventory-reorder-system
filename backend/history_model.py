import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("POSTGRES_URL")

def get_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def init_history_table():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS order_history (
            id SERIAL PRIMARY KEY,
            user_email VARCHAR(255),
            item VARCHAR(255) NOT NULL,
            stock INTEGER,
            mini_stock INTEGER,
            reorder_quantity INTEGER,
            selected_supplier VARCHAR(255),
            approval_status VARCHAR(50),
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    # Add user_email column if it doesn't exist
    cur.execute("""
        ALTER TABLE order_history
        ADD COLUMN IF NOT EXISTS user_email VARCHAR(255)
    """)
    conn.commit()
    cur.close()
    conn.close()
    print("✅ History table ready")

def save_order_history(item: str, stock: int, mini_stock: int,
                       reorder_quantity: int, selected_supplier: str,
                       approval_status: str, user_email: str = None):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO order_history
        (user_email, item, stock, mini_stock, reorder_quantity, selected_supplier, approval_status)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING *
    """, (user_email, item, stock, mini_stock, reorder_quantity, selected_supplier, approval_status))
    row = dict(cur.fetchone())
    conn.commit()
    cur.close()
    conn.close()
    return row

def get_order_history(user_email: str = None):
    conn = get_connection()
    cur = conn.cursor()
    if user_email:
        cur.execute("""
            SELECT * FROM order_history
            WHERE user_email = %s
            ORDER BY created_at DESC LIMIT 20
        """, (user_email,))
    else:
        cur.execute("SELECT * FROM order_history ORDER BY created_at DESC LIMIT 20")
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    conn.close()
    return rows

def get_supplier_stats(user_email: str = None):
    conn = get_connection()
    cur = conn.cursor()
    if user_email:
        cur.execute("""
            SELECT selected_supplier, COUNT(*) as count
            FROM order_history
            WHERE user_email = %s
            GROUP BY selected_supplier
        """, (user_email,))
    else:
        cur.execute("""
            SELECT selected_supplier, COUNT(*) as count
            FROM order_history
            GROUP BY selected_supplier
        """)
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    conn.close()
    return rows