from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from schemas import InvokeRequest, InvokeResponse
from database import get_checkpointer
from graph import build_graph
from auth_routes import router as auth_router
from user_model import init_users_table
from history_model import init_history_table, save_order_history, get_order_history, get_supplier_stats
from email_service import send_low_stock_alert, should_send_alert
from auth import get_current_user

app = FastAPI(
    title="Inventory Reorder API",
    description="LangGraph powered supplier selection backend",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://inventory-reorder-system.vercel.app",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

@app.on_event("startup")
async def startup():
    init_users_table()
    init_history_table()
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

    # Save to history with user email
    save_order_history(
        item=request.item,
        stock=request.stock,
        mini_stock=request.mini_stock,
        reorder_quantity=result.get("reorder_quantity", 0),
        selected_supplier=result.get("selected_supplier", ""),
        approval_status=result.get("approval_status", ""),
        user_email=user_email
    )

    # Send email alert if stock is low
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
    # Railway provides a port automatically, we must use it
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
