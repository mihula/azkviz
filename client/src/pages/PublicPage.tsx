import { useState, useEffect } from 'react'
import { useGameSocket } from '../hooks/useGameSocket'
import HexBoard, { calcHexSize } from '../components/HexBoard'
import { LETTERS_MAP } from 'azkivz-shared'
import type { Round } from 'azkivz-shared'

const TIMER_SECONDS = 10
const FLIP_MS = 700

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

function FlipHex({
  fieldNumber, round, hint, player, hexH, hexW, fontSize,
}: {
  fieldNumber: number
  round: Round
  hint: string | null
  player: 1 | 2 | null
  hexH: number
  hexW: number
  fontSize: number
}) {
  const [showHint, setShowHint] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShowHint(true), Math.round(FLIP_MS * 0.43))
    return () => clearTimeout(t)
  }, [])

  const label = round === 'LETTERS' ? LETTERS_MAP[fieldNumber] : String(fieldNumber)

  const frontBg = 'linear-gradient(160deg, #fef08a 0%, #fbbf24 55%, #d97706 100%)'
  const backBg = player === 2
    ? 'linear-gradient(160deg, #a5f3fc 0%, #22d3ee 55%, #0e7490 100%)'
    : 'linear-gradient(160deg, #fdba74 0%, #f97316 55%, #c2410c 100%)'
  const backTextColor = player === 2 ? '#042f2e' : 'white'

  const glowColor = showHint
    ? (player === 2 ? 'rgba(34,211,238,0.85)' : 'rgba(249,115,22,0.85)')
    : 'rgba(251,191,36,0.95)'

  const hintFontSize = Math.floor(hexH * (hint && hint.length > 4 ? 0.22 : 0.3))

  return (
    <div style={{ animation: `flip-scale-up ${FLIP_MS}ms ease-out forwards` }}>
      <div style={{
        width: hexW,
        height: hexH,
        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
        background: showHint ? backBg : frontBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: `drop-shadow(0 0 28px ${glowColor}) drop-shadow(0 18px 40px rgba(0,0,0,0.85))`,
        animation: showHint
          ? `flip-unfold ${Math.round(FLIP_MS * 0.57)}ms ease-out forwards`
          : `flip-fold ${Math.round(FLIP_MS * 0.43)}ms ease-in forwards`,
      }}>
        <span style={{
          fontSize: showHint ? hintFontSize : fontSize,
          fontWeight: 900,
          color: showHint ? backTextColor : '#1c0f00',
          lineHeight: 1,
          userSelect: 'none',
          letterSpacing: showHint ? '0.06em' : '0',
          textAlign: 'center',
          padding: '0 8%',
        }}>
          {showHint ? (hint ?? '?') : label}
        </span>
      </div>
    </div>
  )
}

export default function PublicPage() {
  const { gameState, connected } = useGameSocket()
  const countdown = useCountdown(gameState.timerStartedAt)
  const [hexSize, setHexSize] = useState(() => calcHexSize(false))

  useEffect(() => {
    const handle = () => setHexSize(calcHexSize(false))
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

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
        <div style={{ width: 56 }} />
      </div>

      {/* Board */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 0, position: 'relative' }}>
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
          <>
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

            {gameState.activeField !== null && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 50,
                pointerEvents: 'none',
              }}>
                <FlipHex
                  key={gameState.activeField}
                  fieldNumber={gameState.activeField}
                  round={gameState.round}
                  hint={gameState.activeFieldHint}
                  player={gameState.activePlayer}
                  hexH={hexSize.hexH}
                  hexW={hexSize.hexW}
                  fontSize={hexSize.fontSize}
                />
              </div>
            )}
          </>
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
