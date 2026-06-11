import { useState } from 'react'

interface PinGateProps {
  onSuccess: (token: string) => void
}

export default function PinGate({ onSuccess }: PinGateProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      if (!res.ok) throw new Error('Nesprávný PIN')
      const { token } = await res.json()
      onSuccess(token)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: '#0d1117' }}>
      <div style={{ fontSize: '1.8rem', fontWeight: 900, background: 'linear-gradient(135deg, #f97316, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AZkvíz</div>
      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, width: 280 }}>
        <h2 style={{ marginBottom: 16, fontSize: '1rem', color: '#94a3b8', textAlign: 'center' }}>Zadej PIN</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
            autoFocus
            style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#f1f5f9', fontSize: '1rem', outline: 'none' }}
          />
          {error && <div style={{ color: '#f87171', fontSize: '0.85rem' }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ padding: '10px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
            {loading ? 'Přihlašuji…' : 'Vstoupit'}
          </button>
        </form>
      </div>
    </div>
  )
}
