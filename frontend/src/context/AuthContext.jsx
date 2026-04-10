import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [role, setRole] = useState('viewer')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    const savedRole = localStorage.getItem('role')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
      setRole(savedRole || 'viewer')
    }
    setLoading(false)
  }, [])

  function login(userData, accessToken) {
    const userRole = userData.role || 'viewer'
    setUser(userData)
    setToken(accessToken)
    setRole(userRole)
    localStorage.setItem('token', accessToken)
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('role', userRole)
  }

  function logout() {
    setUser(null)
    setToken(null)
    setRole('viewer')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('role')
  }

  return (
    <AuthContext.Provider value={{ user, token, role, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}