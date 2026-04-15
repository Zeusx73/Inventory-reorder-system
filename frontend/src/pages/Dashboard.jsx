import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const API_BASE_URL = 'https://inventory-reorder-system-production-ef47.up.railway.app'
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b']

const SUPPLIERS = ['Supplier A', 'Supplier B', 'Supplier C']

function Dashboard() {
  const { user, logout, token, role } = useAuth()
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [supplierStats, setSupplierStats] = useState([])
  const [pendingOrders, setPendingOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionMsg, setActionMsg] = useState('')

  // Override modal state
  const [overrideModal, setOverrideModal] = useState(null)
  const [overrideSupplier, setOverrideSupplier] = useState('')
  const [overrideQuantity, setOverrideQuantity] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const [overrideLoading, setOverrideLoading] = useState(false)

  useEffect(() => {
    if (token) {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchData() {
    try {
      const headers = { 'Authorization': `Bearer ${token?.trim()}` }
      const [historyRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/orders`, { headers }),
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

  // ── NEW: Handle Override ──
  const openOverrideModal = (order) => {
    setOverrideModal(order)
    setOverrideSupplier(order.selected_supplier)
    setOverrideQuantity(order.reorder_quantity)
    setOverrideReason('')
  }

  const handleOverride = async () => {
    if (!overrideSupplier || !overrideQuantity) {
      setActionMsg('⚠️ Please fill all override fields')
      return
    }
    setOverrideLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${overrideModal.id}/override`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token?.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          new_supplier: overrideSupplier,
          new_quantity: parseInt(overrideQuantity),
          override_reason: overrideReason || 'No reason provided'
        })
      })
      if (res.ok) {
        setActionMsg('✏️ Order overridden successfully!')
        setOverrideModal(null)
        fetchData()
        setTimeout(() => setActionMsg(''), 3000)
      } else {
        setActionMsg('❌ Override failed')
      }
    } catch (err) {
      setActionMsg('❌ Override failed')
    } finally {
      setOverrideLoading(false)
    }
  }

  const generatePDF = (order) => {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>Purchase Order - ${order.item}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 28px; }
            .header p { margin: 5px 0 0; opacity: 0.8; }
            .po-number { font-size: 14px; margin-top: 10px; opacity: 0.9; }
            .section { background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
            .section h3 { margin: 0 0 15px; color: #6366f1; font-size: 16px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .field { margin-bottom: 10px; }
            .field label { font-size: 12px; color: #6b7280; display: block; margin-bottom: 4px; }
            .field value { font-size: 16px; font-weight: bold; color: #111; }
            .status-approved { display: inline-block; background: #dcfce7; color: #16a34a; padding: 6px 16px; border-radius: 20px; font-weight: bold; }
            .status-pending { display: inline-block; background: #fef9c3; color: #92400e; padding: 6px 16px; border-radius: 20px; font-weight: bold; }
            .status-overridden { display: inline-block; background: #e0e7ff; color: #4338ca; padding: 6px 16px; border-radius: 20px; font-weight: bold; }
            .footer { text-align: center; margin-top: 40px; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🛒 Purchase Order</h1>
            <p>Inventory Reorder System — AI Powered</p>
            <p class="po-number">PO-${order.id}-${Date.now().toString().slice(-6)}</p>
          </div>
          <div class="section">
            <h3>📦 Order Details</h3>
            <div class="grid">
              <div class="field"><label>Item Name</label><value>${order.item}</value></div>
              <div class="field"><label>Selected Supplier</label><value>${order.selected_supplier}</value></div>
              <div class="field"><label>Reorder Quantity</label><value>${order.reorder_quantity} units</value></div>
              <div class="field"><label>Current Stock</label><value>${order.stock} units</value></div>
              <div class="field"><label>Minimum Stock</label><value>${order.mini_stock} units</value></div>
              <div class="field"><label>Order Status</label><value><span class="status-${order.approval_status}">${order.approval_status?.toUpperCase()}</span></value></div>
              ${order.override_reason ? `<div class="field"><label>Override Reason</label><value>${order.override_reason}</value></div>` : ''}
            </div>
          </div>
          <div class="section">
            <h3>📅 Timeline</h3>
            <div class="grid">
              <div class="field"><label>Order Created</label><value>${new Date(order.created_at).toLocaleString()}</value></div>
              <div class="field"><label>Approved By</label><value>${order.approved_by || 'Pending'}</value></div>
              <div class="field"><label>Approved At</label><value>${order.approved_at ? new Date(order.approved_at).toLocaleString() : 'Pending'}</value></div>
              <div class="field"><label>Generated At</label><value>${new Date().toLocaleString()}</value></div>
            </div>
          </div>
          <div class="footer">
            <p>This is an AI-generated purchase order from Inventory Reorder System</p>
            <p>Powered by LangGraph + FastAPI + React</p>
          </div>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const stockData = history.slice(0, 10).map(h => ({
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
          <h1 style={{ color: 'white', margin: 0, fontSize: '20px' }}>📊 Dashboard</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', margin: '4px 0 0', fontSize: '13px' }}>
            Welcome, {user?.full_name}
            <span style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', marginLeft: '8px' }}>
              {role?.toUpperCase()}
            </span>
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

        {/* Pending Orders */}
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
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {(role === 'admin' || role === 'manager' || role === 'viewer') && (
                      <>
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
                        {/* ── NEW Override Button ── */}
                        <button onClick={() => openOverrideModal(order)} style={{
                          background: '#f59e0b', color: 'white', border: 'none',
                          padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                          fontWeight: 'bold', fontSize: '13px'
                        }}>✏️ Override</button>
                      </>
                    )}
                    <button onClick={() => generatePDF(order)} style={{
                      background: '#6366f1', color: 'white', border: 'none',
                      padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                      fontWeight: 'bold', fontSize: '13px'
                    }}>📄 PDF</button>
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

        {/* ── NEW Override Modal ── */}
        {overrideModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '320px' }}>
              <h3 style={{ margin: '0 0 4px', color: '#374151' }}>✏️ Manual Override</h3>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#9ca3af' }}>
                Overriding AI decision for <strong>{overrideModal.item}</strong>
              </p>

              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                New Supplier
              </label>
              <select
                value={overrideSupplier}
                onChange={e => setOverrideSupplier(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '12px', boxSizing: 'border-box' }}
              >
                {SUPPLIERS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                New Quantity (units)
              </label>
              <input
                type="number"
                value={overrideQuantity}
                onChange={e => setOverrideQuantity(e.target.value)}
                min="1"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '12px', boxSizing: 'border-box' }}
              />

              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                Reason for Override
              </label>
              <textarea
                placeholder="e.g. Lead time drifted, switching supplier..."
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', height: '80px', boxSizing: 'border-box', marginBottom: '16px' }}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleOverride}
                  disabled={overrideLoading}
                  style={{
                    background: '#f59e0b', color: 'white', border: 'none',
                    padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', flex: 1,
                    fontWeight: 'bold', opacity: overrideLoading ? 0.7 : 1
                  }}
                >
                  {overrideLoading ? 'Saving...' : 'Confirm Override'}
                </button>
                <button onClick={() => setOverrideModal(null)} style={{
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
            <p style={{ color: '#9ca3af', textAlign: 'center' }}>No data yet!</p>
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
                  {h.override_reason && (
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#f59e0b' }}>
                      ✏️ Overridden: {h.override_reason}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, color: '#6366f1', fontWeight: 'bold' }}>
                    {h.reorder_quantity} units
                  </p>
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                    background: h.approval_status === 'approved' ? '#dcfce7'
                      : h.approval_status === 'rejected' ? '#fee2e2'
                      : h.approval_status === 'overridden' ? '#e0e7ff'
                      : '#fef9c3',
                    color: h.approval_status === 'approved' ? '#16a34a'
                      : h.approval_status === 'rejected' ? '#dc2626'
                      : h.approval_status === 'overridden' ? '#4338ca'
                      : '#92400e'
                  }}>
                    {h.approval_status}
                  </span>
                  <br />
                  <button onClick={() => generatePDF(h)} style={{
                    background: '#6366f1', color: 'white', border: 'none',
                    padding: '3px 10px', borderRadius: '6px', cursor: 'pointer',
                    fontSize: '11px', marginTop: '4px'
                  }}>📄 PDF</button>
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
