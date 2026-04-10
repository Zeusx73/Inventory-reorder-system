from fastapi import FastAPI, Depends, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from schemas import InvokeRequest, InvokeResponse
from database import get_checkpointer
from graph import build_graph
from auth_routes import router as auth_router
from user_model import init_users_table
from history_model import init_history_table, save_order_history, get_order_history, get_supplier_stats, approve_order, reject_order
from email_service import send_low_stock_alert, should_send_alert
from auth import get_current_user
from inventory_model import init_inventory_table, add_inventory_item, get_inventory, delete_inventory_item, update_inventory_item
import csv
import io

app = FastAPI(
    title="Inventory Reorder API",
    description="LangGraph powered supplier selection backend",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

@app.on_event("startup")
async def startup():
    init_users_table()
    init_history_table()
    init_inventory_table()
    print("🚀 Inventory Reorder API is live!")

@app.get("/")
def root():
    return {"status": "running"}

@app.get("/history")
def history(current_user: dict = Depends(get_current_user)):
    user_email = current_user.get("sub")
    return get_order_history(user_email)

@app.get("/supplier-stats")
def supplier_stats(current_user: dict = Depends(get_current_user)):
    user_email = current_user.get("sub")
    return get_supplier_stats(user_email)

@app.get("/orders/pending")
def get_pending_orders(current_user: dict = Depends(get_current_user)):
    user_email = current_user.get("sub")
    history = get_order_history(user_email)
    return [o for o in history if o.get("approval_status") == "pending"]

@app.post("/orders/{order_id}/approve")
def approve_order_route(order_id: int, current_user: dict = Depends(get_current_user)):
    user_email = current_user.get("sub")
    order = approve_order(order_id, user_email)
    return order

@app.post("/orders/{order_id}/reject")
def reject_order_route(order_id: int, body: dict, current_user: dict = Depends(get_current_user)):
    user_email = current_user.get("sub")
    reason = body.get("reason", "No reason provided")
    order = reject_order(order_id, user_email, reason)
    return order

@app.get("/inventory")
def get_inventory_items(current_user: dict = Depends(get_current_user)):
    user_email = current_user.get("sub")
    return get_inventory(user_email)

@app.post("/inventory")
def add_item(item: dict, current_user: dict = Depends(get_current_user)):
    user_email = current_user.get("sub")
    item_id = add_inventory_item(
        user_email=user_email,
        item_name=item["item_name"],
        current_stock=item["current_stock"],
        daily_sales=item["daily_sales"],
        lead_time=item["lead_time"],
        mini_stock=item["mini_stock"],
        unit_cost=item.get("unit_cost", 0)
    )
    return {"id": item_id, "message": "Item added"}

@app.delete("/inventory/{item_id}")
def delete_item(item_id: int, current_user: dict = Depends(get_current_user)):
    user_email = current_user.get("sub")
    delete_inventory_item(item_id, user_email)
    return {"message": "Item deleted"}

@app.post("/inventory/bulk-upload")
async def bulk_upload(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    user_email = current_user.get("sub")
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8")))
    count = 0
    for row in reader:
        add_inventory_item(
            user_email=user_email,
            item_name=row["item_name"],
            current_stock=int(row["current_stock"]),
            daily_sales=float(row["daily_sales"]),
            lead_time=int(row["lead_time"]),
            mini_stock=int(row["mini_stock"]),
            unit_cost=float(row.get("unit_cost", 0))
        )
        count += 1
    return {"message": f"{count} items uploaded"}

@app.post("/invoke", response_model=InvokeResponse)
def invoke_graph(request: InvokeRequest, current_user: dict = Depends(get_current_user)):
    config = {"configurable": {"thread_id": request.thread_id}}
    user_email = current_user.get("sub")

    suppliers = []
    for s in request.supplier_options:
        if isinstance(s, dict):
            suppliers.append(s)
        else:
            suppliers.append(s.dict())

    with get_checkpointer() as checkpointer:
        graph_app = build_graph(checkpointer)
        result = graph_app.invoke({
            "task": "select best supplier",
            "item": request.item,
            "stock": request.stock,
            "daily_sales": request.daily_sales,
            "lead_time": request.lead_time,
            "mini_stock": request.mini_stock,
            "supplier_options": suppliers
        }, config=config)

    save_order_history(
        item=request.item,
        stock=request.stock,
        mini_stock=request.mini_stock,
        reorder_quantity=result.get("reorder_quantity", 0),
        selected_supplier=result.get("selected_supplier", ""),
        approval_status=result.get("approval_status", "pending"),
        user_email=user_email,
        supplier_scores=result.get("supplier_scores", [])
    )

    if should_send_alert(request.stock, request.mini_stock):
        send_low_stock_alert(
            item=request.item,
            stock=request.stock,
            reorder_quantity=result.get("reorder_quantity", 0),
            selected_supplier=result.get("selected_supplier", "Unknown")
        )

    return InvokeResponse(
        thread_id=request.thread_id,
        selected_supplier=result.get("selected_supplier", ""),
        reorder_quantity=result.get("reorder_quantity", 0),
        approval_status=result.get("approval_status", ""),
        message=result.get("message", ""),
        result=result.get("result", ""),
        reasoning=result.get("reasoning", "")
    )

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)