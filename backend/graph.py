import os
from typing import TypedDict
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, START, END

llm = ChatGroq(model="llama-3.3-70b-versatile",
               api_key=os.getenv("GROQ_API_KEY"))

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

def score_suppliers(suppliers: list[dict]) -> list[dict]:
    """Real supplier scoring algorithm with weighted criteria."""
    reliability_map = {
        "Very High": 100,
        "High": 75,
        "Medium": 50,
        "Low": 25
    }

    # Find min/max for normalization
    prices = [s.get("price_per_unit", 0) for s in suppliers]
    times = [s.get("delivery_time", 0) for s in suppliers]
    min_price, max_price = min(prices), max(prices)
    min_time, max_time = min(times), max(times)

    scored = []
    for s in suppliers:
        # Price score: lower price = higher score (40% weight)
        if max_price == min_price:
            price_score = 100
        else:
            price_score = (1 - (s["price_per_unit"] - min_price) / (max_price - min_price)) * 100

        # Reliability score (35% weight)
        reliability_score = reliability_map.get(s.get("reliability", "Medium"), 50)

        # Delivery time score: faster = higher score (25% weight)
        if max_time == min_time:
            time_score = 100
        else:
            time_score = (1 - (s["delivery_time"] - min_time) / (max_time - min_time)) * 100

        # Weighted total score
        total_score = (price_score * 0.40) + (reliability_score * 0.35) + (time_score * 0.25)

        scored.append({
            **s,
            "price_score": round(price_score, 1),
            "reliability_score": round(reliability_score, 1),
            "time_score": round(time_score, 1),
            "total_score": round(total_score, 1)
        })

    # Sort by total score descending
    return sorted(scored, key=lambda x: x["total_score"], reverse=True)

def calculate_reorder(state: State):
    prompt = f"""You are an inventory management expert.

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

    reorder_quantity = max(0, state["mini_stock"] - state["stock"])
    for line in content.split("\n"):
        if "REORDER_QUANTITY:" in line:
            try:
                reorder_quantity = int(line.split(":")[1].strip())
            except: pass

    return {"reorder_quantity": reorder_quantity,
            "reasoning": content,
            "message": content}

def select_supplier(state: State):
    # Score suppliers using algorithm first
    scored_suppliers = score_suppliers(state["supplier_options"])
    best_supplier = scored_suppliers[0]

    # Build scoring summary for LLM context
    scoring_summary = "\n".join([
        f"- {s['name']}: Total Score={s['total_score']}/100 "
        f"(Price={s['price_score']}, Reliability={s['reliability_score']}, Speed={s['time_score']})"
        for s in scored_suppliers
    ])

    prompt = f"""You are a procurement expert making a supplier selection decision.
Inventory Situation:
- Item: {state['item']}
- Units to Reorder: {state['reorder_quantity']}
- Current Stock: {state['stock']} units
- Daily Sales: {state['daily_sales']} units/day
- Lead Time Available: {state['lead_time']} days

Algorithmic Scoring Results (weighted: Price 40%, Reliability 35%, Speed 25%):
{scoring_summary}

Top Recommended Supplier: {best_supplier['name']} (Score: {best_supplier['total_score']}/100)

Confirm this selection and explain WHY this supplier scored highest.
Mention the risks of each other supplier.
Give a professional procurement recommendation in 4-5 sentences.

End your response with exactly this line:
SELECTED_SUPPLIER: {best_supplier['name']}"""

    response = llm.invoke(prompt)
    content = response.content

    selected = best_supplier["name"]
    for line in content.split("\n"):
        if "SELECTED_SUPPLIER:" in line:
            selected = line.split(":")[1].strip()
            break

    return {"selected_supplier": selected,
            "supplier_scores": scored_suppliers,
            "approval_status": "pending",
            "message": content,
            "result": content}

def generate_final_report(state: State):
    # Build score table
    scores_text = ""
    if state.get("supplier_scores"):
        scores_text = "\nSupplier Scores:\n" + "\n".join([
            f"- {s['name']}: {s['total_score']}/100"
            for s in state["supplier_scores"]
        ])

    prompt = f"""You are a senior supply chain manager writing an executive summary.

Decision Made:
- Item: {state['item']}
- Reorder Quantity: {state['reorder_quantity']} units
- Selected Supplier: {state['selected_supplier']}
- Current Stock: {state['stock']} units
- Minimum Stock: {state['mini_stock']} units
{scores_text}

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