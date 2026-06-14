import { useState, useEffect, useRef, useMemo } from 'react'
import { useGameSocket } from '../hooks/useGameSocket'
import HexBoard, { calcHexSize } from '../components/HexBoard'
import { LETTERS_MAP } from 'azkivz-shared'
import type { Round } from 'azkivz-shared'

const TIMER_SECONDS = 10

const FLY_OUT_MS = 480
const FOLD_MS = 240
const UNFOLD_MS = 240
const FOLD_BACK_MS = 160
const UNFOLD_BACK_MS = 160
const RETURN_MS = 420

interface ChipState {
  fieldNumber: number
  round: Round
  player: 1 | 2 | null
  hint: string | null
  hexTx: number
  hexTy: number
  tx: number
  ty: number
  outerScale: number
  outerTransition: string
  innerScaleX: number
  innerTransition: string
  showHint: boolean
}

// BFS to find the winning connected component (mirrors server winChecker)
const ROW_STARTS = [0, 1, 3, 6, 10, 15, 21]
const LEFT_EDGE  = new Set([1, 2, 4, 7, 11, 16, 22])
const RIGHT_EDGE = new Set([1, 3, 6, 10, 15, 21, 28])
const BOTTOM_ROW = new Set([22, 23, 24, 25, 26, 27, 28])

function hexNeighbors(f: number): number[] {
  const idx = f - 1
  let row = 0
  while (row < 6 && ROW_STARTS[row + 1] <= idx) row++
  const col = idx - ROW_STARTS[row]
  return ([
    [row, col - 1], [row, col + 1],
    [row - 1, col - 1], [row - 1, col],
    [row + 1, col], [row + 1, col + 1],
  ] as [number, number][])
    .map(([r, c]) => (r >= 0 && r <= 6 && c >= 0 && c <= r) ? ROW_STARTS[r] + c + 1 : null)
    .filter((v): v is number => v !== null)
}

function getWinningComponent(claimed: number[]): number[] {
  const claimedSet = new Set(claimed)
  const visited = new Set<number>()
  for (const start of claimed) {
    if (visited.has(start)) continue
    const comp: number[] = []
    const queue = [start]
    while (queue.length) {
      const curr = queue.shift()!
      if (comp.includes(curr)) continue
      comp.push(curr)
      visited.add(curr)
      for (const nb of hexNeighbors(curr)) {
        if (claimedSet.has(nb) && !comp.includes(nb)) queue.push(nb)
      }
    }
    if (comp.some(f => LEFT_EDGE.has(f)) && comp.some(f => RIGHT_EDGE.has(f)) && comp.some(f => BOTTOM_ROW.has(f))) {
      return comp
    }
  }
  return []
}

function useCountdown(timerStartedAt: string | null): number | null {
  const [remaining, setRemaining] = useState<number | null>(null)
  useEffect(() => {
    if (!timerStartedAt) { setRemaining(null); return }
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
  return (
    <div style={{
      width: 140, height: 162,
      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
      background: `conic-gradient(from -90deg, ${empty} 0% ${emptyPct}%, ${filled} ${emptyPct}% 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: '3.8rem', fontWeight: 900, color: textColor, lineHeight: 1, userSelect: 'none' }}>
        {Math.ceil(r)}
      </span>
    </div>
  )
}

export default function PublicPage() {
  const { gameState, connected } = useGameSocket()
  const countdown = useCountdown(gameState.timerStartedAt)
  const [hexSize, setHexSize] = useState(() => calcHexSize(false))
  const [chip, setChip] = useState<ChipState | null>(null)

  const boardRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const chipRef = useRef<ChipState | null>(null)
  chipRef.current = chip

  useEffect(() => {
    const handle = () => setHexSize(calcHexSize(false))
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    const t = (fn: () => void, ms: number) => { timers.push(setTimeout(fn, ms)) }

    if (gameState.activeField !== null) {
      const fieldNumber = gameState.activeField
      const hexEl = boardRef.current?.querySelector(`[data-field="${fieldNumber}"]`) as HTMLElement | null
      const overlayEl = overlayRef.current

      if (hexEl && overlayEl) {
        const hexR = hexEl.getBoundingClientRect()
        const ovR = overlayEl.getBoundingClientRect()
        const hexTx = (hexR.left + hexR.width / 2) - (ovR.left + ovR.width / 2)
        const hexTy = (hexR.top + hexR.height / 2) - (ovR.top + ovR.height / 2)

        setChip({
          fieldNumber, round: gameState.round,
          player: gameState.activePlayer, hint: gameState.activeFieldHint,
          hexTx, hexTy,
          tx: hexTx, ty: hexTy, outerScale: 1,
          outerTransition: 'none',
          innerScaleX: 1, innerTransition: 'none',
          showHint: false,
        })

        t(() => {
          setChip(c => c?.fieldNumber === fieldNumber ? {
            ...c,
            tx: 0, ty: 0, outerScale: 1.5,
            outerTransition: `transform ${FLY_OUT_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            innerScaleX: 0,
            innerTransition: `transform ${FOLD_MS}ms ease-in`,
          } : c)
        }, 20)

        t(() => {
          setChip(c => c?.fieldNumber === fieldNumber ? {
            ...c,
            showHint: true,
            innerScaleX: 1,
            innerTransition: `transform ${UNFOLD_MS}ms ease-out`,
          } : c)
        }, 20 + FOLD_MS)
      }

    } else if (chipRef.current !== null) {
      setChip(c => c ? { ...c, innerScaleX: 0, innerTransition: `transform ${FOLD_BACK_MS}ms ease-in` } : null)

      t(() => {
        setChip(c => c ? { ...c, showHint: false, innerScaleX: 1, innerTransition: `transform ${UNFOLD_BACK_MS}ms ease-out` } : null)
      }, FOLD_BACK_MS)

      t(() => {
        setChip(c => c ? {
          ...c,
          tx: c.hexTx, ty: c.hexTy, outerScale: 1,
          outerTransition: `transform ${RETURN_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        } : null)
      }, FOLD_BACK_MS + UNFOLD_BACK_MS)

      t(() => setChip(null), FOLD_BACK_MS + UNFOLD_BACK_MS + RETURN_MS)
    }

    return () => timers.forEach(clearTimeout)
  }, [gameState.activeField])

  const winningFields = useMemo(() => {
    if (gameState.status !== 'FINISHED' || !gameState.winner) return []
    const claimed = gameState.winner === 1 ? gameState.claimedP1 : gameState.claimedP2
    return getWinningComponent(claimed)
  }, [gameState.status, gameState.winner, gameState.claimedP1, gameState.claimedP2])

  const { hexW, hexH, fontSize } = hexSize

  const chipFrontBg = 'linear-gradient(160deg, #fef08a 0%, #fbbf24 55%, #d97706 100%)'
  const chipBackBg = chip?.player === 2
    ? 'linear-gradient(160deg, #a5f3fc 0%, #22d3ee 55%, #0e7490 100%)'
    : 'linear-gradient(160deg, #fdba74 0%, #f97316 55%, #c2410c 100%)'
  const chipBackText = chip?.player === 2 ? '#042f2e' : 'white'
  const chipGlow = chip?.showHint
    ? (chip.player === 2 ? 'rgba(34,211,238,0.85)' : 'rgba(249,115,22,0.85)')
    : 'rgba(251,191,36,0.95)'
  const chipHintFontSize = Math.floor(hexH * (chip?.hint && chip.hint.length > 4 ? 0.22 : 0.3))
  const chipLabel = chip
    ? (chip.round === 'LETTERS' ? LETTERS_MAP[chip.fieldNumber] : String(chip.fieldNumber))
    : ''

  const winnerName = gameState.winner === 1
    ? (gameState.player1Name || 'Hráč 1')
    : (gameState.player2Name || 'Hráč 2')
  const winnerColor = gameState.winner === 1 ? '#f97316' : '#22d3ee'
  const winnerGlow = gameState.winner === 1 ? 'rgba(249,115,22,0.85)' : 'rgba(34,211,238,0.85)'

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

      {/* Board area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 0, position: 'relative' }}>
        {gameState.status === 'WAITING' ? (
          <div style={{ color: '#475569', fontSize: '1.2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>⏳</div>
            Hra ještě nezačala…
          </div>
        ) : (
          <>
            {/* Board — visible during PLAYING and FINISHED */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ width: 140, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {gameState.status === 'PLAYING' && gameState.activeField !== null && gameState.activePlayer === 1 && (
                  <TimerHex remaining={countdown} player={1} />
                )}
              </div>
              <HexBoard
                gameState={gameState}
                containerRef={boardRef}
                hiddenField={chip?.fieldNumber ?? null}
                winningFields={winningFields}
              />
              <div style={{ width: 140, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {gameState.status === 'PLAYING' && gameState.activeField !== null && gameState.activePlayer === 2 && (
                  <TimerHex remaining={countdown} player={2} />
                )}
              </div>
            </div>

            {/* Dark overlay — dims non-winner fields on FINISHED */}
            {gameState.status === 'FINISHED' && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.68)',
                zIndex: 15,
                pointerEvents: 'none',
                animation: 'winner-overlay-in 0.6s ease-out',
              }} />
            )}

            {/* Chip overlay — always rendered so ref is valid */}
            <div
              ref={overlayRef}
              style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, pointerEvents: 'none' }}
            >
              {chip && (
                <div style={{
                  transform: `translate(${chip.tx}px, ${chip.ty}px) scale(${chip.outerScale})`,
                  transition: chip.outerTransition,
                }}>
                  <div style={{
                    width: hexW, height: hexH,
                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                    background: chip.showHint ? chipBackBg : chipFrontBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    filter: `drop-shadow(0 0 28px ${chipGlow}) drop-shadow(0 18px 40px rgba(0,0,0,0.85))`,
                    transform: `scaleX(${chip.innerScaleX})`,
                    transition: chip.innerTransition,
                  }}>
                    <span style={{
                      fontSize: chip.showHint ? chipHintFontSize : fontSize,
                      fontWeight: 900,
                      color: chip.showHint ? chipBackText : '#1c0f00',
                      lineHeight: 1, userSelect: 'none',
                      letterSpacing: chip.showHint ? '0.06em' : '0',
                      textAlign: 'center', padding: '0 8%',
                    }}>
                      {chip.showHint ? (chip.hint && chip.hint !== '0' ? chip.hint : '?') : chipLabel}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Winner overlay — large text on top */}
            {gameState.status === 'FINISHED' && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                zIndex: 100, pointerEvents: 'none',
              }}>
                <div style={{
                  background: 'rgba(0,0,0,0.55)',
                  backdropFilter: 'blur(14px)',
                  borderRadius: 28,
                  padding: '28px 64px',
                  textAlign: 'center',
                  border: `1px solid ${winnerColor}44`,
                  boxShadow: `0 0 60px ${winnerGlow}`,
                  animation: 'winner-text-in 0.5s 0.5s cubic-bezier(0.2, 0, 0.2, 1.4) both',
                }}>
                  <div style={{ fontSize: '3.5rem', lineHeight: 1, marginBottom: 12 }}>🏆</div>
                  <div style={{
                    fontSize: '5.5rem', fontWeight: 900,
                    color: winnerColor,
                    textShadow: `0 0 48px ${winnerGlow}, 0 0 16px ${winnerGlow}`,
                    lineHeight: 1,
                  }}>
                    {winnerName}
                  </div>
                  <div style={{
                    fontSize: '2rem', fontWeight: 700,
                    color: '#f1f5f9',
                    marginTop: 14,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                  }}>
                    Vyhrál!
                  </div>
                </div>
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
