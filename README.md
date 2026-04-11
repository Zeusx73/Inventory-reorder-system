# 🛒 Inventory Reorder System

> AI-Powered Inventory Management with LangGraph Multi-Agent System

**Live Demo:** [inventory-reorder-system.vercel.app](https://inventory-reorder-system.vercel.app)

---

## ✨ Features

- 🤖 **AI Supplier Selection** — LangGraph multi-agent system scores suppliers using weighted algorithm (Price 40%, Reliability 35%, Speed 25%)
- 📦 **Multi-Item Inventory** — Add items manually or bulk upload via CSV
- ✅ **Approval Workflow** — Pending → Approved → Rejected with role-based access
- 📄 **PDF Purchase Orders** — Auto-generated professional purchase orders
- 📊 **Real-time Dashboard** — Charts, supplier analytics, order history
- 🔐 **JWT Authentication** — Secure login with role-based access (Admin/Manager/Viewer)
- 📧 **Email Alerts** — Automatic low stock notifications via Resend API
- 👥 **Multi-tenant** — Each user sees only their own data

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Recharts, Vercel |
| Backend | FastAPI, LangGraph, Railway |
| Database | Neon PostgreSQL |
| AI/LLM | Groq Llama 3.3 70B |
| Auth | JWT, Passlib, bcrypt |
| Email | Resend API |

---

## 🚀 How It Works

1. User enters inventory data (item, stock, daily sales, lead time)
2. **LangGraph Agent 1** calculates reorder quantity using EOQ logic
3. **LangGraph Agent 2** scores all suppliers using weighted algorithm
4. **LangGraph Agent 3** generates executive summary report
5. Order saved to PostgreSQL with pending approval status
6. Admin approves/rejects from dashboard
7. PDF purchase order generated on approval
8. Email alert sent if stock is critically low

---

## 📸 Screenshots

### Dashboard
- Real-time stock vs reorder level charts
- Supplier selection pie chart
- Pending approvals with one-click approve/reject

### AI Decision
- Supplier scores with breakdown
- Reorder quantity calculation
- Executive summary reasoning

---

## 🛠️ Local Setup

```bash
# Clone repo
git clone https://github.com/Zeusx73/Inventory-reorder-system.git

# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm start
Environment Variables
POSTGRES_URL=your_neon_url
GROQ_API_KEY=your_groq_key
RESEND_API_KEY=your_resend_key
SECRET_KEY=your_secret_key
👨‍💻 Built By
Akash — Full-Stack AI Developer specializing in multi-agent systems and LangGraph workflows.
GitHub: @Zeusx73
Powered by LangGraph + FastAPI + React
