import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

const API_BASE_URL = 'https://expert-parakeet-q7r7xrqww9p6c4jw4-8000.app.github.dev'

function MainApp() {
  const { user, logout, token } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    thread_id: `thread_${Date.now()}`,
    item: '',
    stock: 0,
    daily_sales: 0,
    lead_time: 0,
    mini_stock: 0,
    supplier_options: []
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const sampleSuppliers = [
    { name: 'Supplier A', price_per_unit: 10, delivery_time: 3, reliability: 'High' },
    { name: 'Supplier B', price_per_unit: 9, delivery_time: 5, reliability: 'Medium' },
    { name: 'Supplier C', price_per_unit: 11, delivery_time: 2, reliability: 'Very High' }
  ]

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('stock') || name.includes('sales') ||
              name.includes('time') || name.includes('mini')
              ? parseInt(value) || 0
              : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch(`${API_BASE_URL}/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          supplier_options: sampleSuppliers
        }),
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="header" style={{ paddingBottom: '16px' }}>
        <h1>🛒 Inventory Reorder System</h1>
        <p>AI-Powered Supplier Selection</p>
        <div style={{
          marginTop: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <span style={{ color: 'white', fontSize: '14px' }}>
            👋 Welcome, {user?.full_name}
          </span>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.4)',
              padding: '6px 16px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            📊 Dashboard
          </button>
          <button
            onClick={logout}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.4)',
              padding: '6px 16px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="main">
        <div className="form-section">
          <h2>📦 Enter Inventory Data</h2>
          <form onSubmit={handleSubmit} className="inventory-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Item Name</label>
                <input
                  type="text"
                  name="item"
                  value={formData.item}
                  onChange={handleInputChange}
                  placeholder="e.g., Laptop Battery"
                  required
                />
              </div>
              <div className="form-group">
                <label>Current Stock</label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Daily Sales</label>
                <input
                  type="number"
                  name="daily_sales"
                  value={formData.daily_sales}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Lead Time (days)</label>
                <input
                  type="number"
                  name="lead_time"
                  value={formData.lead_time}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Minimum Stock</label>
                <input
                  type="number"
                  name="mini_stock"
                  value={formData.mini_stock}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? '🤖 AI Analyzing...' : '🚀 Run Analysis'}
            </button>
          </form>
        </div>

        {error && (
          <div className="error-section">
            <h3>❌ Error</h3>
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="result-section">
            <h2>✅ AI Decision</h2>
            <div className="result-card">
              <div className="key-metrics">
                <div className="metric">
                  <span className="label">Selected Supplier</span>
                  <span className="value">{result.selected_supplier || 'N/A'}</span>
                </div>
                <div className="metric">
                  <span className="label">Reorder Quantity</span>
                  <span className="value">{result.reorder_quantity || 0} units</span>
                </div>
                <div className="metric">
                  <span className="label">Status</span>
                  <span className={`status ${result.approval_status}`}>
                    {result.approval_status || 'N/A'}
                  </span>
                </div>
              </div>
              {result.message && (
                <div className="reasoning">
                  <h4>🤖 AI Reasoning:</h4>
                  <pre>{result.message}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Powered by LangGraph + FastAPI + React</p>
      </footer>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/" element={
            <ProtectedRoute>
              <MainApp />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App