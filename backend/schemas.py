from pydantic import BaseModel

class InvokeRequest(BaseModel):
    thread_id: str
    item: str
    stock: int
    daily_sales: int
    lead_time: int
    mini_stock: int
    supplier_options: list[dict]

class InvokeResponse(BaseModel):
    thread_id: str
    selected_supplier: str
    reorder_quantity: int
    approval_status: str
    message: str
    result: str
    reasoning: str