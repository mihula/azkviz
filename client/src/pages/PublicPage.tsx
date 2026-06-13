import { useState, useEffect } from 'react'
import { useGameSocket } from '../hooks/useGameSocket'
import HexBoard from '../components/HexBoard'

const TIMER_SECONDS = 10

function useCountdown(timerStartedAt: string | null): number | null {
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (!timerStartedAt) {
      setRemaining(null)
      return
    }
    const tick = () => {
      const elapsed = (Date.now() - new Date(timerStartedAt).getTime()) / 1000
      setRemaining(Math.max(0, TIMER_SECONDS - elapsed))
    }
    tick()
    const id = setInterval(tick, 100)
    return () => clearInterval(id)
  }, [timerStartedAt])

  return remaining
}

function TimerHex({ remaining, player }: { remaining: number | null; player: 1 | 2 }) {
  const r = remaining ?? TIMER_SECONDS
  const emptyPct = (1 - r / TIMER_SECONDS) * 100
  const filled = player === 1 ? '#f97316' : '#22d3ee'
  const empty = player === 1 ? '#fed7aa' : '#cffafe'
  const textColor = player === 1 ? '#431407' : '#042f2e'
  const seconds = Math.ceil(r)
  return (
    <div style={{
      width: 140, height: 162,
      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
      background: `conic-gradient(from -90deg, ${empty} 0% ${emptyPct}%, ${filled} ${emptyPct}% 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: '3.8rem', fontWeight: 900, color: textColor, lineHeight: 1, userSelect: 'none' }}>
        {seconds}
      </span>
    </div>
  )
}

export default function PublicPage() {
  const { gameState, connected } = useGameSocket()
  const countdown = useCountdown(gameState.timerStartedAt)

  return (
    <div style={{
      height: '100vh', width: '100vw', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 12px', gap: '6px', position: 'relative', zIndex: 1,
    }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexShrink: 0, height: 52 }}>
        <div style={{ fontSize: '1.8rem', fontWeight: 900, background: 'linear-gradient(135deg, #f97316, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          AZkvíz
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '4px 14px', fontSize: '0.85rem', color: '#94a3b8' }}>
          <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: connected ? '#22c55e' : '#ef4444', boxShadow: connected ? '0 0 6px #22c55e' : 'none' }} />
          {gameState.round === 'NUMBERS' ? '1. kolo — Čísla' : '2. kolo — Písmena'}
        </div>
        {gameState.activeField && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 24, padding: '6px 18px', fontSize: '1rem', color: '#fbbf24', fontWeight: 500 }}>
            <span style={{ width: 8, height: 8, background: '#fbbf24', borderRadius: '50%' }} />
            Aktivní: <strong style={{ marginLeft: 4, color: '#fde68a', fontSize: '1.2rem' }}>{gameState.activeField}</strong>
            {gameState.activeFieldHint && (
              <span style={{ marginLeft: 8, background: 'rgba(251,191,36,0.2)', borderRadius: 8, padding: '2px 10px', fontSize: '1.1rem', fontWeight: 900, letterSpacing: '0.05em', color: '#fde68a' }}>
                {gameState.activeFieldHint}
              </span>
            )}
          </div>
        )}
        <div style={{ width: 56 }} />
      </div>

      {/* Board */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 0 }}>
        {gameState.status === 'WAITING' ? (
          <div style={{ color: '#475569', fontSize: '1.2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>⏳</div>
            Hra ještě nezačala…
          </div>
        ) : gameState.status === 'FINISHED' ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🏆</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fbbf24' }}>
              Vyhrál {gameState.winner === 1 ? gameState.player1Name : gameState.player2Name}!
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ width: 140, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {gameState.activeField !== null && gameState.activePlayer === 1 && (
                <TimerHex remaining={countdown} player={1} />
              )}
            </div>
            <HexBoard gameState={gameState} />
            <div style={{ width: 140, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {gameState.activeField !== null && gameState.activePlayer === 2 && (
                <TimerHex remaining={countdown} player={2} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Players */}
      <div style={{ display: 'flex', gap: 12, width: '100%', flexShrink: 0, height: 72 }}>
        {[1, 2].map((p) => {
          const name = p === 1 ? gameState.player1Name : gameState.player2Name
          const isActive = gameState.status === 'PLAYING' && gameState.activePlayer === p
          const color = p === 1
            ? { bg: 'rgba(249,115,22,.2)', border: 'rgba(249,115,22,.35)', dot: '#f97316', dotBg: 'linear-gradient(135deg,#fb923c,#c2410c)' }
            : { bg: 'rgba(34,211,238,.2)', border: 'rgba(34,211,238,.35)', dot: '#22d3ee', dotBg: 'linear-gradient(135deg,#67e8f9,#0e7490)' }
          return (
            <div key={p} style={{
              flex: 1, borderRadius: 14, padding: '0 20px',
              display: 'flex', alignItems: 'center', gap: 14,
              border: `${isActive ? 2 : 1}px solid ${color.border}`,
              background: color.bg,
              flexDirection: p === 2 ? 'row-reverse' : 'row',
              boxShadow: isActive ? `0 0 16px ${color.dot}44` : 'none',
              transition: 'box-shadow 0.3s',
            }}>
              <div style={{ width: 40, height: 46, clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', background: color.dotBg, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f1f5f9', textAlign: p === 2 ? 'right' : 'left' }}>
                  {name || (p === 1 ? 'Hráč 1' : 'Hráč 2')}
                </div>
                {isActive && (
                  <div style={{ fontSize: '0.7rem', color: color.dot, fontWeight: 600, textAlign: p === 2 ? 'right' : 'left', letterSpacing: '0.5px' }}>
                    NA TAHU
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
