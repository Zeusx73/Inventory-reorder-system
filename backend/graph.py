import os
from typing import TypedDict
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, START, END

# Same LLM setup as before — pulled out of main script
llm = ChatGroq(model="llama-3.3-70b-versatile",
               api_key=os.getenv("GROQ_API_KEY"))
        

        # Same State definition — nothing changes here
class State(TypedDict):
    task: str
    item: str
    stock: int
    daily_sales: int
    lead_time: int
    mini_stock: int
    reorder_quantity: int
    supplier_options: list[dict]
    supplier_scores: list[dict]
    selected_supplier: str
    approval_status: str
    message: str
    result: str
    reasoning: str

                                                            # Same node functions — unchanged
                                                    
def calculate_reorder(state: State):
    prompt = f"""
    You are an inventory management expert.

    Analyze this inventory situation:
    - Item: {state['item']}
    - Current Stock: {state['stock']} units
    - Minimum Stock Required: {state['mini_stock']} units
    - Daily Sales: {state['daily_sales']} units/day
    - Supplier Lead Time: {state['lead_time']} days

    Calculate:
    1. How many units need to be reordered RIGHT NOW
    2. How many days until stockout if we don't reorder
    3. Is this situation URGENT or NORMAL?

    Give a clear analysis in 3-4 sentences.
    End your response with exactly this line:
    REORDER_QUANTITY: <number>"""
                                                                    

    response = llm.invoke(prompt)
    content = response.content

                                                                                # Extract reorder quantity from LLM response
    reorder_quantity = max(0, state["mini_stock"] - state["stock"])
    for line in content.split("\n"):
        if "REORDER_QUANTITY:" in line:
            try:
                reorder_quantity = int(line.split(":")[1].strip())
            except:pass

    return {"reorder_quantity": reorder_quantity,
            "reasoning": content,
            "message": content}
                                                                                                                                                                                        

def select_supplier(state: State):
    prompt = f"""
    You are a procurement expert making a supplier selection decision.
    Inventory Situation:
    - Item: {state['item']}
    - Units to Reorder: {state['reorder_quantity']}
    -Current Stock: {state['stock']} units
    -Daily Sales: {state['daily_sales']} units/day
    - Lead Time Available: {state['lead_time']} days

    Available Suppliers:
                                                                                                                                                                                                                                {state['supplier_options']}

                                                                                                                                                                                                                                    Analyze each supplier and decide:
                                                                                                                                                                                                                                        1. Which supplier is the BEST choice and why?
                                                                                                                                                                                                                                            2. What are the risks of each supplier?
                                                                                                                                                                                                                                                3. Is this order URGENT?

                                                                                                                                                                                                                                                    Give a professional procurement recommendation in 4-5 sentences.
                                                                                                                                                                                                                                                        End your response with exactly this line:
                                                                                                                                                                                                                                                            SELECTED_SUPPLIER: <supplier name>
                                                                                                                                                                                                                                                                """

    response = llm.invoke(prompt)
    content = response.content

                                                                                                                                                                                                                                                                            # Extract supplier name from LLM response
    selected = state["supplier_options"][0]["name"]
    for line in content.split("\n"):
            if "SELECTED_SUPPLIER:" in line:
                selected = line.split(":")[1].strip()
                break

    return {"selected_supplier": selected,
            "supplier_scores": state["supplier_options"],
            "approval_status": "pending",
            "message": content,
            "result": content}


def generate_final_report(state: State):
    prompt = f"""
    you are a senior supply chain manager writing an executive summary.

    Decision Made:
    - Item: {state['item']}
    - Reorder Quantity: {state['reorder_quantity']} units
    - Selected Supplier: {state['selected_supplier']}
    - Current Stock: {state['stock']} units
    - Minimum Stock: {state['mini_stock']} units

    Write a brief executive summary (3-4 sentences) of this reorder decision
    that a business owner would understand. Include the key risk if we do NOT act."""

    response = llm.invoke(prompt)

    return {"result": response.content,
            "message": response.content}

def build_graph(checkpointer):
    builder = StateGraph(State)

    builder.add_node("calculate_reorder", calculate_reorder)
    builder.add_node("select_supplier", select_supplier)
    builder.add_node("generate_final_report", generate_final_report)

    builder.add_edge(START, "calculate_reorder")
    builder.add_edge("calculate_reorder", "select_supplier")
    builder.add_edge("select_supplier", "generate_final_report")
    builder.add_edge("generate_final_report", END)

    return builder.compile(checkpointer=checkpointer)


                            
                                                
                                        
                                                                                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                                                                                                                
                                                                                                                                                                                                    