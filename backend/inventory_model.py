import os
import psycopg2

def get_conn():
    return psycopg2.connect(os.environ["POSTGRES_URL"])

def init_inventory_table():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS inventory (
            id SERIAL PRIMARY KEY,
            user_email TEXT NOT NULL,
            item_name TEXT NOT NULL,
            current_stock INTEGER NOT NULL,
            daily_sales FLOAT NOT NULL,
            lead_time INTEGER NOT NULL,
            mini_stock INTEGER NOT NULL,
            unit_cost FLOAT DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)
    conn.commit()
    cur.close()
    conn.close()
    print("✅ Inventory table ready")

def add_inventory_item(user_email, item_name, current_stock, daily_sales, lead_time, mini_stock, unit_cost=0):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO inventory (user_email, item_name, current_stock, daily_sales, lead_time, mini_stock, unit_cost)
        VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id
    """, (user_email, item_name, current_stock, daily_sales, lead_time, mini_stock, unit_cost))
    item_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return item_id

def get_inventory(user_email):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, item_name, current_stock, daily_sales, lead_time, mini_stock, unit_cost, updated_at
        FROM inventory WHERE user_email = %s ORDER BY updated_at DESC
    """, (user_email,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [
        {
            "id": r[0], "item_name": r[1], "current_stock": r[2],
            "daily_sales": r[3], "lead_time": r[4], "mini_stock": r[5],
            "unit_cost": r[6], "updated_at": str(r[7])
        } for r in rows
    ]

def delete_inventory_item(item_id, user_email):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM inventory WHERE id = %s AND user_email = %s", (item_id, user_email))
    conn.commit()
    cur.close()
    conn.close()

def update_inventory_item(item_id, user_email, **kwargs):
    conn = get_conn()
    cur = conn.cursor()
    fields = ", ".join([f"{k} = %s" for k in kwargs])
    values = list(kwargs.values()) + [item_id, user_email]
    cur.execute(f"UPDATE inventory SET {fields}, updated_at = NOW() WHERE id = %s AND user_email = %s", values)
    conn.commit()
    cur.close()
    conn.close()