import os
import uvicorn
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langgraph.checkpoint.memory import MemorySaver
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Optional

from auth import get_current_user
from auth_routes import router as auth_router
from schemas import InvokeRequest, InvokeResponse
from graph import build_graph
from history_model import (
    init_history_table,
    save_order_history,
    get_order_history,
    approve_order,
    reject_order,
    override_order        # ← ADD this import to history_model.py too
)
from inventory_model import (
    init_inventory_table,
    get_inventory,
    add_inventory_item,
    delete_inventory_item,
    update_inventory_item
)
from user_model import init_users_table

load_dotenv()

# =========================
# APP INIT
# =========================
app = FastAPI(title="🚀 Inventory Reorder API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://inventory-reorder-system.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# ROUTERS
# =========================
app.include_router(auth_router)

# =========================
# LANGGRAPH SETUP
# =========================
checkpointer = MemorySaver()
graph = build_graph(checkpointer)

# =========================
# STARTUP
# =========================
@app.on_event("startup")
def startup():
    init_users_table()
    init_history_table()
    init_inventory_table()
    print("🚀 Inventory Reorder API is live!")

# =========================
# HEALTH CHECK
# =========================
@app.get("/")
def root():
    return {"status": "running", "message": "Inventory Reorder API is live!"}

# =========================
# INVOKE (AI Agent)
# =========================
@app.post("/invoke", response_model=InvokeResponse)
def invoke(request: InvokeRequest, user: dict = Depends(get_current_user)):
    config = {"configurable": {"thread_id": request.thread_id}}

    initial_state = {
        "task": "analyze_inventory",
        "item": request.item,
        "stock": request.stock,
        "daily_sales": request.daily_sales,
        "lead_time": request.lead_time,
        "mini_stock": request.mini_stock,
        "supplier_options": request.supplier_options,
        "reorder_quantity": 0,
        "supplier_scores": [],
        "selected_supplier": "",
        "approval_status": "pending",
        "message": "",
        "result": "",
        "reasoning": ""
    }

    result = graph.invoke(initial_state, config=config)

    save_order_history(
        item=result["item"],
        stock=result["stock"],
        mini_stock=result["mini_stock"],
        reorder_quantity=result["reorder_quantity"],
        selected_supplier=result["selected_supplier"],
        approval_status="pending",
        user_email=user.get("sub"),
        supplier_scores=result.get("supplier_scores", [])
    )

    return InvokeResponse(
        thread_id=request.thread_id,
        selected_supplier=result["selected_supplier"],
        reorder_quantity=result["reorder_quantity"],
        approval_status=result["approval_status"],
        message=result["message"],
        result=result["result"],
        reasoning=result["reasoning"]
    )

# =========================
# ORDER HISTORY
# =========================
@app.get("/orders")
def get_orders(user: dict = Depends(get_current_user)):
    return get_order_history(user_email=user.get("sub"))

@app.post("/orders/{order_id}/approve")
def approve(order_id: int, user: dict = Depends(get_current_user)):
    order = approve_order(order_id, approved_by=user.get("sub"))
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@app.post("/orders/{order_id}/reject")
def reject(order_id: int, reason: dict = {}, user: dict = Depends(get_current_user)):
    rejection_reason = reason.get("reason", "No reason provided")
    order = reject_order(order_id, approved_by=user.get("sub"), reason=rejection_reason)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

# =========================
# MANUAL OVERRIDE  ← NEW
# =========================
class OverrideRequest(BaseModel):
    new_supplier: str
    new_quantity: int
    override_reason: Optional[str] = "No reason provided"

@app.post("/orders/{order_id}/override")
def override(order_id: int, body: OverrideRequest, user: dict = Depends(get_current_user)):
    order = override_order(
        order_id=order_id,
        new_supplier=body.new_supplier,
        new_quantity=body.new_quantity,
        override_reason=body.override_reason,
        overridden_by=user.get("sub")
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

# =========================
# INVENTORY
# =========================
@app.get("/inventory")
def get_inventory_items(user: dict = Depends(get_current_user)):
    return get_inventory(user_email=user.get("sub"))

@app.post("/inventory")
def add_item(item: dict, user: dict = Depends(get_current_user)):
    return add_inventory_item(
        user_email=user.get("sub"),
        item_name=item["item_name"],
        current_stock=item["current_stock"],
        daily_sales=item["daily_sales"],
        lead_time=item["lead_time"],
        mini_stock=item["mini_stock"],
        unit_cost=item.get("unit_cost", 0)
    )

@app.put("/inventory/{item_id}")
def update_item(item_id: int, item: dict, user: dict = Depends(get_current_user)):
    update_inventory_item(item_id, user.get("sub"), **item)
    return {"message": "Updated"}

@app.delete("/inventory/{item_id}")
def delete_item(item_id: int, user: dict = Depends(get_current_user)):
    delete_inventory_item(item_id, user.get("sub"))
    return {"message": "Deleted"}

# =========================
# RUN
# =========================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port