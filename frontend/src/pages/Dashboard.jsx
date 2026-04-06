import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const API_BASE_URL = 'https://inventory-reorder-system-production.up.railway.app';
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b']

function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [supplierStats, setSupplierStats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const token = localStorage.getItem('token')
      const headers = {
        'Authorization': `Bearer ${token}`
      }
      const [historyRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/history`, { headers }),
        fetch(`${API_BASE_URL}/supplier-stats`, { headers })
      ])
      const historyData = await historyRes.json()
      const statsData = await statsRes.json()
      setHistory(historyData.reverse())
      setSupplierStats(statsData)
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  const stockData = history.slice(-10).map(h => ({
    name: h.item,
    stock: h.stock,
    minimum: h.mini_stock,
    reorder: h.reorder_quantity
  }))

  if (loading) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center',
        alignItems: 'center', height: '100vh',
        background: '#f0f4ff', color: '#6366f1', fontSize: '18px'
      }}>
        Loading dashboard...
      </div>
    )
  }

  return (
    <div style={{ background: '#f0f4ff', minHeight: '100vh' }}>
      <div style={{
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ color: 'white', margin: 0, fontSize: '20px' }}>
            📊 Dashboard
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', margin: '4px 0 0 0', fontSize: '13px' }}>
            Welcome, {user?.full_name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => navigate('/')} style={{
            background: 'rgba(255,255,255,0.2)',
            color: 'white', border: '1px solid rgba(255,255,255,0.4)',
            padding: '8px 16px', borderRadius: '20px',
            cursor: 'pointer', fontSize: '13px'
          }}>
            🏠 Home
          </button>
          <button onClick={logout} style={{
            background: 'rgba(255,255,255,0.2)',
            color: 'white', border: '1px solid rgba(255,255,255,0.4)',
            padding: '8px 16px', borderRadius: '20px',
            cursor: 'pointer', fontSize: '13px'
          }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '13px' }}>Total Orders</p>
            <p style={{ color: '#6366f1', margin: '8px 0 0 0', fontSize: '32px', fontWeight: 'bold' }}>
              {history.length}
            </p>
          </div>
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '13px' }}>Suppliers Used</p>
            <p style={{ color: '#8b5cf6', margin: '8px 0 0 0', fontSize: '32px', fontWeight: 'bold' }}>
              {supplierStats.length}
            </p>
          </div>
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '13px' }}>Low Stock Alerts</p>
            <p style={{ color: '#ef4444', margin: '8px 0 0 0', fontSize: '32px', fontWeight: 'bold' }}>
              {history.filter(h => h.stock <= h.mini_stock).length}
            </p>
          </div>
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '13px' }}>Total Reordered</p>
            <p style={{ color: '#22c55e', margin: '8px 0 0 0', fontSize: '32px', fontWeight: 'bold' }}>
              {history.reduce((sum, h) => sum + (h.reorder_quantity || 0), 0)}
            </p>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
          <h3 style={{ color: '#374151', margin: '0 0 20px 0' }}>📦 Stock vs Reorder Levels</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stockData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="stock" fill="#6366f1" name="Current Stock" radius={[4,4,0,0]} />
              <Bar dataKey="reorder" fill="#22c55e" name="Reorder Qty" radius={[4,4,0,0]} />
              <Bar dataKey="minimum" fill="#ef4444" name="Min Stock" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
          <h3 style={{ color: '#374151', margin: '0 0 20px 0' }}>🏆 Supplier Selection</h3>
          {supplierStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={supplierStats}
                  dataKey="count"
                  nameKey="selected_supplier"
                  cx="50%" cy="50%"
                  outerRadius={80}
                  label={({ selected_supplier, count }) => `${selected_supplier}: ${count}`}
                >
                  {supplierStats.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: '#9ca3af', textAlign: 'center' }}>No data yet — run some analyses first!</p>
          )}
        </div>

        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h3 style={{ color: '#374151', margin: '0 0 20px 0' }}>📋 Recent Orders</h3>
          {history.length > 0 ? (
            history.slice(-5).reverse().map((h, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '12px 0',
                borderBottom: i < 4 ? '1px solid #f3f4f6' : 'none'
              }}>
                <div>
                  <p style={{ margin: 0, fontWeight: '600', color: '#374151' }}>{h.item}</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                    {h.selected_supplier} • {new Date(h.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, color: '#6366f1', fontWeight: 'bold' }}>
                    {h.reorder_quantity} units
                  </p>
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                    background: h.approval_status === 'approved' ? '#dcfce7' : '#fef3c7',
                    color: h.approval_status === 'approved' ? '#16a34a' : '#92400e'
                  }}>
                    {h.approval_status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: '#9ca3af', textAlign: 'center' }}>No orders yet!</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard