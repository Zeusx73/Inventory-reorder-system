from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os, csv, io, uvicorn
from dotenv import load_dotenv
from groq import Groq
from typing import List

# =========================
# LOAD ENV
# =========================
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise Exception("❌ GROQ_API_KEY missing in .env")

client = Groq(api_key=GROQ_API_KEY)

# =========================
# FASTAPI INIT
# =========================
app = FastAPI(title="Inventory AI System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change later in production,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# IN-MEMORY DATABASE (simple)
# =========================
inventory_db = []
orders_db = []
order_id_counter = 1

# =========================
# SCHEMAS
# =========================
class Supplier(BaseModel):
    name: str
    price: float
    rating: float
    delivery_days: int

class InvokeRequest(BaseModel):
    item: str
    stock: int
    daily_sales: float
    lead_time: int
    mini_stock: int
    supplier_options: List[Supplier]

# =========================
# AI LOGIC (Groq)
# =========================
def call_ai(data):
    prompt = f"""
    You are an expert supply chain AI.

    Item: {data['item']}
    Current Stock: {data['stock']}
    Daily Sales: {data['daily_sales']}
    Lead Time: {data['lead_time']}
    Minimum Stock: {data['mini_stock']}

    Suppliers:
    {data['supplier_options']}

    Task:
    1. Select best supplier
    2. Calculate reorder quantity
    3. Give reasoning

    Return JSON:
    selected_supplier, reorder_quantity, reasoning
    """

    response = client.chat.completions.create(
        model="llama3-70b-8192",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )

    return response.choices[0].message.content

# =========================
# ROUTES
# =========================

@app.get("/")
def root():
    return {"status": "running"}

# -------- Inventory --------
@app.get("/inventory")
def get_inventory():
    return inventory_db

@app.post("/inventory")
def add_inventory(item: dict):
    inventory_db.append(item)
    return {"message": "Item added"}

@app.delete("/inventory/{index}")
def delete_inventory(index: int):
    try:
        inventory_db.pop(index)
        return {"message": "Deleted"}
    except:
        raise HTTPException(404, "Item not found")

@app.post("/inventory/bulk-upload")
async def bulk_upload(file: UploadFile = File(...)):
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode()))
    
    count = 0
    for row in reader:
        inventory_db.append(row)
        count += 1

    return {"uploaded": count}

# -------- Orders + AI --------
@app.post("/invoke")
def invoke_ai(request: InvokeRequest):
    global order_id_counter

    data = request.dict()
    ai_result = call_ai(data)

    # fallback simple logic (in case parsing fails)
    reorder_qty = int(request.daily_sales * request.lead_time)
    best_supplier = max(request.supplier_options, key=lambda s: s.rating).name

    order = {
        "id": order_id_counter,
        "item": request.item,
        "selected_supplier": best_supplier,
        "reorder_quantity": reorder_qty,
        "ai_response": ai_result,
        "status": "pending"
    }

    orders_db.append(order)
    order_id_counter += 1

    return order

@app.get("/orders")
def get_orders():
    return orders_db

@app.post("/orders/{order_id}/approve")
def approve(order_id: int):
    for o in orders_db:
        if o["id"] == order_id:
            o["status"] = "approved"
            return o
    raise HTTPException(404, "Order not found")

@app.post("/orders/{order_id}/reject")
def reject(order_id: int):
    for o in orders_db:
        if o["id"] == order_id:
            o["status"] = "rejected"
            return o
    raise HTTPException(404, "Order not found")

# =========================
# RUN
# =========================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)