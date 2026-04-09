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
            approved_by VARCHAR(255),
            approved_at TIMESTAMP,
            rejection_reason TEXT,
            supplier_scores JSONB,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    # Add new columns if they don't exist
    for col, definition in [
        ("user_email", "VARCHAR(255)"),
        ("approved_by", "VARCHAR(255)"),
        ("approved_at", "TIMESTAMP"),
        ("rejection_reason", "TEXT"),
        ("supplier_scores", "JSONB"),
    ]:
        cur.execute(f"""
            ALTER TABLE order_history
            ADD COLUMN IF NOT EXISTS {col} {definition}
        """)
    conn.commit()
    cur.close()
    conn.close()
    print("✅ History table ready")

def save_order_history(item: str, stock: int, mini_stock: int,
                       reorder_quantity: int, selected_supplier: str,
                       approval_status: str, user_email: str = None,
                       supplier_scores: list = None):
    import json
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO order_history
        (user_email, item, stock, mini_stock, reorder_quantity, selected_supplier, approval_status, supplier_scores)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING *
    """, (user_email, item, stock, mini_stock, reorder_quantity, selected_supplier, approval_status,
          json.dumps(supplier_scores) if supplier_scores else None))
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

def approve_order(order_id: int, approved_by: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE order_history
        SET approval_status = 'approved',
            approved_by = %s,
            approved_at = NOW()
        WHERE id = %s
        RETURNING *
    """, (approved_by, order_id))
    row = dict(cur.fetchone())
    conn.commit()
    cur.close()
    conn.close()
    return row

def reject_order(order_id: int, approved_by: str, reason: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE order_history
        SET approval_status = 'rejected',
            approved_by = %s,
            approved_at = NOW(),
            rejection_reason = %s
        WHERE id = %s
        RETURNING *
    """, (approved_by, reason, order_id))
    row = dict(cur.fetchone())
    conn.commit()
    cur.close()
    conn.close()
    return row

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