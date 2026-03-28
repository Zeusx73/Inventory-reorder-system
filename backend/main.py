from fastapi import FastAPI,HTTPException
from fastapi.middleware.cors import CORSMiddleware
from schemas import InvokeRequest, InvokeResponse
from database import get_checkpointer
from graph import build_graph


 # FastAPI() creates the app instance
 # This is the object uvicorn will serve
app =FastAPI(title="Inventory Reorder API",
description="langgraph powered supplier selection backend",
version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
                        )


 # @app.get("/") registers a GET route at "/"
 # This is a health check — tells you the server is alive
@app.get("/")
def root():
     return {"Status": "running"}
         
         # @app.post registers a POST route
         # InvokeRequest = what comes IN (request body)
         # InvokeResponse = what goes OUT (response body)
         # FastAPI reads these types and auto-generates docs at /docs 
@app.post("/invoke",response_model=InvokeResponse)
def invoke_graph(request:InvokeRequest):
    config={"configurable":{"thread_id":request.thread_id}}
    with get_checkpointer() as checkpointer:
        graph_app=build_graph(checkpointer)
        try:
            result = graph_app.invoke({"task": "select best supplier",
                                       "item": request.item,
                                       "stock": request.stock,
                                       "daily_sales": request.daily_sales,
                                       "lead_time": request.lead_time,
                                       "mini_stock": request.mini_stock,
                                       "supplier_options": request.supplier_options},
                                        config=config)
                                                            
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    return InvokeResponse(thread_id=request.thread_id,
                          selected_supplier=result.get("selected_supplier", ""),
                          reorder_quantity=result.get("reorder_quantity", ""),
                          approval_status=result.get("approval_status", ""),
                          message=result.get("message", ""),
                          result=result.get("result", ""),
                          reasoning=result.get("reasoning", ""))
                                    
    
                                                                                                                                                                                                                                                                                                                                            