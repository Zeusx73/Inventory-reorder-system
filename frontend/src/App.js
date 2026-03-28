// App.jsx - Complete React Frontend
import React, { useState } from 'react';
import './App.css';

const API_BASE_URL ="https://expert-parakeet-q7r7xrqww9p6c4jw4-3000.app.github.dev/"

function App() {
  const [formData, setFormData] = useState({
    thread_id: `thread_${Date.now()}`,
    item: '',
    stock: 0,
    daily_sales: 0,
    lead_time: 0,
    mini_stock: 0,
    supplier_options: []
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sampleSuppliers = [
    { name: 'Supplier A', price_per_unit: 10, delivery_time: 3, reliability: 'High' },
    { name: 'Supplier B', price_per_unit: 9, delivery_time: 5, reliability: 'Medium' },
    { name: 'Supplier C', price_per_unit: 11, delivery_time: 2, reliability: 'Very High' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('stock') || name.includes('sales') || 
              name.includes('time') || name.includes('mini') 
              ? parseInt(value) || 0 
              : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          supplier_options: sampleSuppliers
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🛒 Inventory Reorder System</h1>
        <p>AI-Powered Supplier Selection</p>
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
                  placeholder="0"
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
                  placeholder="0"
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
                  placeholder="0"
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
                  placeholder="0"
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
        <p>Thread ID: <code>{formData.thread_id}</code></p>
      </footer>
    </div>
  );
}

export default App;