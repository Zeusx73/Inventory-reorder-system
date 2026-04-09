import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'https://inventory-reorder-system-production-ef47.up.railway.app';

export default function InventoryPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    item_name: '', current_stock: '', daily_sales: '',
    lead_time: '', mini_stock: '', unit_cost: ''
  });

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/inventory`, {
        headers: { 'Authorization': `Bearer ${token?.trim() || ''}` }
      });
      const data = await res.json();
      setItems(data);
    } catch (err) {
      setError('Failed to load inventory');
    }
  };

  const handleAdd = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token?.trim() || ''}`
        },
        body: JSON.stringify({
          item_name: form.item_name,
          current_stock: parseInt(form.current_stock),
          daily_sales: parseFloat(form.daily_sales),
          lead_time: parseInt(form.lead_time),
          mini_stock: parseInt(form.mini_stock),
          unit_cost: parseFloat(form.unit_cost || 0)
        })
      });
      if (!res.ok) throw new Error('Failed to add item');
      setSuccess('Item added!');
      setShowForm(false);
      setForm({ item_name: '', current_stock: '', daily_sales: '', lead_time: '', mini_stock: '', unit_cost: '' });
      fetchItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/inventory/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token?.trim() || ''}` }
      });
      fetchItems();
    } catch (err) {
      setError('Failed to delete item');
    }
  };

  const handleCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/bulk-upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token?.trim() || ''}` },
        body: formData
      });
      const data = await res.json();
      setSuccess(data.message);
      fetchItems();
    } catch (err) {
      setError('CSV upload failed');
    }
  };

  const handleAnalyze = (item) => {
    navigate('/', { state: { item } });
  };

  const isLowStock = (item) => item.current_stock <= item.mini_stock;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '16px', padding: '20px', marginBottom: '20px', color: 'white' }}>
          <h1 style={{ margin: 0, fontSize: '24px' }}>📦 Inventory Management</h1>
          <p style={{ margin: '5px 0 0', opacity: 0.8 }}>Welcome, {user?.full_name}</p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button onClick={() => setShowForm(!showForm)} style={{ background: '#4CAF50', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            ➕ Add Item
          </button>
          <label style={{ background: '#2196F3', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            📤 Upload CSV
            <input type="file" accept=".csv" onChange={handleCSV} style={{ display: 'none' }} />
          </label>
          <button onClick={() => navigate('/')} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>
            🏠 Home
          </button>
        </div>

        {/* CSV Format hint */}
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', marginBottom: '20px', color: 'white', fontSize: '12px' }}>
          📋 CSV format: <code>item_name, current_stock, daily_sales, lead_time, mini_stock, unit_cost</code>
        </div>

        {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>❌ {error}</div>}
        {success && <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>✅ {success}</div>}

        {/* Add Form */}
        {showForm && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 15px' }}>Add New Item</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                ['item_name', 'Item Name', 'text'],
                ['current_stock', 'Current Stock', 'number'],
                ['daily_sales', 'Daily Sales', 'number'],
                ['lead_time', 'Lead Time (days)', 'number'],
                ['mini_stock', 'Minimum Stock', 'number'],
                ['unit_cost', 'Unit Cost ($)', 'number']
              ].map(([key, label, type]) => (
                <div key={key}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>{label}</label>
                  <input
                    type={type}
                    value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button onClick={handleAdd} disabled={loading} style={{ background: '#667eea', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                {loading ? 'Adding...' : '✅ Save Item'}
              </button>
              <button onClick={() => setShowForm(false)} style={{ background: '#eee', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Inventory Table */}
        <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#667eea', color: 'white' }}>
                {['Item', 'Stock', 'Daily Sales', 'Lead Time', 'Min Stock', 'Unit Cost', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#999' }}>No items yet. Add items or upload CSV.</td></tr>
              ) : (
                items.map((item, i) => (
                  <tr key={item.id} style={{ background: i % 2 === 0 ? '#f9f9f9' : 'white', borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 'bold' }}>{item.item_name}</td>
                    <td style={{ padding: '10px 8px', color: isLowStock(item) ? '#e53935' : '#333', fontWeight: isLowStock(item) ? 'bold' : 'normal' }}>{item.current_stock}</td>
                    <td style={{ padding: '10px 8px' }}>{item.daily_sales}</td>
                    <td style={{ padding: '10px 8px' }}>{item.lead_time}d</td>
                    <td style={{ padding: '10px 8px' }}>{item.mini_stock}</td>
                    <td style={{ padding: '10px 8px' }}>${item.unit_cost}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <span style={{ background: isLowStock(item) ? '#ffebee' : '#e8f5e9', color: isLowStock(item) ? '#e53935' : '#2e7d32', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                        {isLowStock(item) ? '⚠️ LOW' : '✅ OK'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={() => handleAnalyze(item)} style={{ background: '#667eea', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>🚀 Analyze</button>
                        <button onClick={() => handleDelete(item.id)} style={{ background: '#ffebee', color: '#e53935', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}