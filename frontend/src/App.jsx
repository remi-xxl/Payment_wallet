import { useState, useEffect, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL || '/api/v1'

function storeToken(token) {
  if (token) localStorage.setItem('token', token)
  else localStorage.removeItem('token')
}

function getToken() {
  return localStorage.getItem('token')
}

async function api(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${API}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  })
  const data = await res.json()
  if (!res.ok && data.stack) console.error('API error:', data.stack)
  return data
}

function App() {
  const [view, setView] = useState('login')
  const [user, setUser] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [transferMsg, setTransferMsg] = useState(null)

  const showMessage = (msg, isError = true) => {
    setMessage({ text: msg, isError })
    setTimeout(() => setMessage(null), 4000)
  }

  const fetchWallet = useCallback(async () => {
    const data = await api('/wallet/me')
    if (data.success) setWallet(data.data.wallet)
  }, [])

  const fetchHistory = useCallback(async () => {
    const data = await api('/transactions/history?limit=20')
    if (data.success) setTransactions(data.data.transactions)
  }, [])

  useEffect(() => {
    if (user) {
      fetchWallet()
      fetchHistory()
    }
  }, [user, fetchWallet, fetchHistory])

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true)
    const data = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, firstName, lastName }),
    })
    setLoading(false)
    if (data.success) {
      storeToken(data.data.accessToken)
      setUser(data.data.user)
      showMessage('Account created!', false)
    } else {
      showMessage(data.message || 'Registration failed')
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setLoading(false)
    if (data.success) {
      storeToken(data.data.accessToken)
      setUser(data.data.user)
      showMessage('Logged in!', false)
    } else {
      showMessage(data.message || 'Login failed')
    }
  }

  async function handleTransfer(e) {
    e.preventDefault()
    setTransferMsg(null)
    setLoading(true)
    const body = { amount: parseFloat(amount) }
    if (recipient.includes('@')) body.recipientEmail = recipient
    else body.accountNumber = recipient
    if (description) body.description = description

    const data = await api('/transactions/transfer', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    setLoading(false)
    if (data.success) {
      setTransferMsg({ text: `Transferred N${amount} successfully!`, ok: true })
      setAmount('')
      setDescription('')
      fetchWallet()
      fetchHistory()
    } else {
      setTransferMsg({ text: data.message, ok: false })
    }
  }

  function handleLogout() {
    api('/auth/logout', { method: 'POST' })
    storeToken(null)
    setUser(null)
    setWallet(null)
    setTransactions([])
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">PayFast</h1>
            <p className="text-gray-500 mt-1">Secure banking at your fingertips</p>
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm mb-4 ${message.isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {message.text}
            </div>
          )}

          {view === 'login' ? (
            <form onSubmit={handleLogin}>
              <div className="space-y-4">
                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50">
                  {loading ? 'Please wait...' : 'Sign In'}
                </button>
              </div>
              <p className="text-center text-sm text-gray-500 mt-4">
                Don't have an account?{' '}
                <button type="button" onClick={() => { setView('register'); setMessage(null) }} className="text-blue-600 hover:underline font-medium">Register</button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div className="space-y-4">
                <input type="text" placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} required minLength={2} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                <input type="text" placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} required minLength={1} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                <input type="password" placeholder="Password (min 8 chars)" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                <button type="submit" disabled={loading} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition disabled:opacity-50">
                  {loading ? 'Please wait...' : 'Create Account'}
                </button>
              </div>
              <p className="text-center text-sm text-gray-500 mt-4">
                Already have an account?{' '}
                <button type="button" onClick={() => { setView('login'); setMessage(null) }} className="text-blue-600 hover:underline font-medium">Sign In</button>
              </p>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">PayFast</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome, {user.firstName}</span>
            <button onClick={handleLogout} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition">Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {wallet && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-blue-200 text-sm">Account Balance</p>
            <p className="text-4xl font-bold mt-1">N{parseFloat(wallet.balance).toLocaleString()}</p>
            <p className="text-blue-200 text-sm mt-2">Account: {wallet.accountNumber}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Send Money</h2>
            {transferMsg && (
              <div className={`p-3 rounded-lg text-sm mb-4 ${transferMsg.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {transferMsg.text}
              </div>
            )}
            <form onSubmit={handleTransfer} className="space-y-4">
              <input type="text" placeholder="Email or Account Number" value={recipient} onChange={e => setRecipient(e.target.value)} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
              <input type="number" step="0.01" min="0.01" placeholder="Amount (NGN)" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
              <input type="text" placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} maxLength={100} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
              <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50">
                {loading ? 'Processing...' : 'Send Money'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Transactions</h2>
            {transactions.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No transactions yet</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {transactions.map(tx => {
                  const isCredit = wallet && tx.receiverWalletId === wallet.id
                  return (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {isCredit ? 'From' : 'To'}: {isCredit ? tx.senderWallet?.user?.email : tx.receiverWallet?.user?.email || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleString()}</p>
                        {tx.description && <p className="text-xs text-gray-400">{tx.description}</p>}
                      </div>
                      <span className={`font-semibold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                        {isCredit ? '+' : '-'}N{parseFloat(tx.amount).toLocaleString()}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
