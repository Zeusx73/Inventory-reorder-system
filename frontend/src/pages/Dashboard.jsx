import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const API_BASE_URL = 'https://inventory-reorder-system-production-ef47.up.railway.app'
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b']

function Dashboard() {
  const { user, logout, token } = useAuth()
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [supplierStats, setSupplierStats] = useState([])
  const [pendingOrders, setPendingOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionMsg, setActionMsg] = useState('')

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { // eslint-disable-line react-hooks/exhaustive-deps
  // eslint-disable-next-line
  }, [])

  async function fetchData() {
    try {
      const headers = { 'Authorization': `Bearer ${token?.trim()}` }
      const [historyRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/history`, { headers }),
        fetch(`${API_BASE_URL}/supplier-stats`, { headers })
      ])
      const historyData = await historyRes.json()
      const statsData = await statsRes.json()
      const reversed = historyData.reverse()
      setHistory(reversed)
      setSupplierStats(statsData)
      setPendingOrders(reversed.filter(o => o.approval_status === 'pending'))
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (orderId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token?.trim()}` }
      })
      if (res.ok) {
        setActionMsg('✅ Order approved!')
        fetchData()
        setTimeout(() => setActionMsg(''), 3000)
      }
    } catch (err) {
      setActionMsg('❌ Failed to approve')
    }
  }

  const handleReject = async (orderId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token?.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: rejectReason })
      })
      if (res.ok) {
        setActionMsg('❌ Order rejected!')
        setRejectModal(null)
        setRejectReason('')
        fetchData()
        setTimeout(() => setActionMsg(''), 3000)
      }
    } catch (err) {
      setActionMsg('❌ Failed to reject')
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
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ color: 'white', margin: 0, fontSize: '20px' }}>📊 Dashboard</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', margin: '4px 0 0', fontSize: '13px' }}>
            Welcome, {user?.full_name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => navigate('/')} style={{
            background: 'rgba(255,255,255,0.2)', color: 'white',
            border: '1px solid rgba(255,255,255,0.4)', padding: '8px 16px',
            borderRadius: '20px', cursor: 'pointer', fontSize: '13px'
          }}>🏠 Home</button>
          <button onClick={logout} style={{
            background: 'rgba(255,255,255,0.2)', color: 'white',
            border: '1px solid rgba(255,255,255,0.4)', padding: '8px 16px',
            borderRadius: '20px', cursor: 'pointer', fontSize: '13px'
          }}>Logout</button>
        </div>
      </div>

      <div style={{ padding: '20px' }}>

        {/* Action message */}
        {actionMsg && (
          <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontWeight: 'bold' }}>
            {actionMsg}
          </div>
        )}

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '13px' }}>Total Orders</p>
            <p style={{ margin: '8px 0 0', fontSize: '32px', fontWeight: 'bold', color: '#6366f1' }}>{history.length}</p>
          </div>
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '13px' }}>Suppliers Used</p>
            <p style={{ margin: '8px 0 0', fontSize: '32px', fontWeight: 'bold', color: '#8b5cf6' }}>{supplierStats.length}</p>
          </div>
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '13px' }}>Low Stock Alerts</p>
            <p style={{ margin: '8px 0 0', fontSize: '32px', fontWeight: 'bold', color: '#ef4444' }}>
              {history.filter(h => h.stock <= h.mini_stock).length}
            </p>
          </div>
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '13px' }}>Pending Approvals</p>
            <p style={{ margin: '8px 0 0', fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>
              {pendingOrders.length}
            </p>
          </div>
        </div>

        {/* Pending Approvals Section */}
        {pendingOrders.length > 0 && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
            <h3 style={{ color: '#374151', margin: '0 0 16px' }}>⏳ Pending Approvals ({pendingOrders.length})</h3>
            {pendingOrders.map(order => (
              <div key={order.id} style={{
                border: '1px solid #fde68a', borderRadius: '12px',
                padding: '16px', marginBottom: '12px', background: '#fffbeb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px' }}>{order.item}</p>
                    <p style={{ margin: '4px 0', color: '#6b7280', fontSize: '13px' }}>
                      Supplier: <strong>{order.selected_supplier}</strong> •
                      Qty: <strong>{order.reorder_quantity} units</strong> •
                      Stock: <strong>{order.stock}</strong>
                    </p>
                    <p style={{ margin: '4px 0', color: '#9ca3af', fontSize: '12px' }}>
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleApprove(order.id)} style={{
                      background: '#22c55e', color: 'white', border: 'none',
                      padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                      fontWeight: 'bold', fontSize: '13px'
                    }}>✅ Approve</button>
                    <button onClick={() => setRejectModal(order.id)} style={{
                      background: '#ef4444', color: 'white', border: 'none',
                      padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                      fontWeight: 'bold', fontSize: '13px'
                    }}>❌ Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reject Modal */}
        {rejectModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '300px' }}>
              <h3 style={{ margin: '0 0 16px' }}>Reject Order</h3>
              <textarea
                placeholder="Reason for rejection..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', height: '100px', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button onClick={() => handleReject(rejectModal)} style={{
                  background: '#ef4444', color: 'white', border: 'none',
                  padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', flex: 1
                }}>Confirm Reject</button>
                <button onClick={() => setRejectModal(null)} style={{
                  background: '#eee', border: 'none',
                  padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', flex: 1
                }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
          <h3 style={{ color: '#374151', margin: '0 0 20px' }}>📦 Stock vs Reorder Levels</h3>
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
          <h3 style={{ color: '#374151', margin: '0 0 20px' }}>🏆 Supplier Selection</h3>
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

        {/* Recent Orders */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h3 style={{ color: '#374151', margin: '0 0 20px' }}>📋 Recent Orders</h3>
          {history.length > 0 ? (
            history.slice(0, 5).map((h, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '12px 0',
                borderBottom: i < 4 ? '1px solid #f3f4f6' : 'none'
              }}>
                <div>
                  <p style={{ margin: 0, fontWeight: '600', color: '#374151' }}>{h.item}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#9ca3af' }}>
                    {h.selected_supplier} • {new Date(h.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, color: '#6366f1', fontWeight: 'bold' }}>
                    {h.reorder_quantity} units
                  </p>
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                    background: h.approval_status === 'approved' ? '#dcfce7' : h.approval_status === 'rejected' ? '#fee2e2' : '#fef9c3',
                    color: h.approval_status === 'approved' ? '#16a34a' : h.approval_status === 'rejected' ? '#dc2626' : '#92400e'
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