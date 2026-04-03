import os
import resend
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY")
EMAIL_FROM = os.getenv("EMAIL_FROM", "onboarding@resend.dev")
EMAIL_TO = os.getenv("EMAIL_TO")

def send_low_stock_alert(item: str, stock: int, reorder_quantity: int, selected_supplier: str):
    """Send email alert when stock is low."""
    
    try:
        params = {
            "from": EMAIL_FROM,
            "to": [EMAIL_TO],
            "subject": f"⚠️ Low Stock Alert: {item}",
            "html": f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">⚠️ Low Stock Alert</h1>
                    <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0;">Inventory Reorder System</p>
                </div>
                
                <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #374151;">Stock Alert for: {item}</h2>
                    
                    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444;">
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">Current Stock</p>
                        <p style="margin: 5px 0 0 0; font-size: 28px; font-weight: bold; color: #ef4444;">{stock} units</p>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0;">
                        <div style="background: white; border-radius: 8px; padding: 16px; border-left: 4px solid #6366f1;">
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">Reorder Quantity</p>
                            <p style="margin: 5px 0 0 0; font-size: 22px; font-weight: bold; color: #6366f1;">{reorder_quantity} units</p>
                        </div>
                        <div style="background: white; border-radius: 8px; padding: 16px; border-left: 4px solid #22c55e;">
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">Selected Supplier</p>
                            <p style="margin: 5px 0 0 0; font-size: 22px; font-weight: bold; color: #22c55e;">{selected_supplier}</p>
                        </div>
                    </div>

                    <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
                        <p style="margin: 0; color: #92400e;">
                            🤖 <strong>AI Recommendation:</strong> Reorder {reorder_quantity} units 
                            from {selected_supplier} immediately to avoid stockout.
                        </p>
                    </div>

                    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
                        Powered by Inventory AI — LangGraph + FastAPI + React
                    </p>
                </div>
            </div>
            """,
        }
        
        response = resend.Emails.send(params)
        print(f"✅ Email alert sent for {item}!")
        return True
        
    except Exception as e:
        print(f"❌ Email failed: {e}")
        return False

def should_send_alert(stock: int, mini_stock: int) -> bool:
    """Check if stock is low enough to trigger alert."""
    return stock <= mini_stock * 1.5