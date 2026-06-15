import { useState, useRef, useEffect } from 'react'
import { useGameSocket } from '../hooks/useGameSocket'
import HexBoard from '../components/HexBoard'
import PinGate from '../components/PinGate'
import { Question, Round } from 'azkivz-shared'

function CorrectionButtons({ fieldNumber, owner, player1Name, player2Name, onCorrect }: {
  fieldNumber: number
  owner: 'p1' | 'p2'
  player1Name: string
  player2Name: string
  onCorrect: (action: 'free' | 'p1' | 'p2' | 'unanswered') => void
}) {
  const ownerName = owner === 'p1' ? (player1Name || 'Hráč 1') : (player2Name || 'Hráč 2')
  const ownerColor = owner === 'p1' ? '#f97316' : '#22d3ee'
  return (
    <>
      <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', padding: '4px 0' }}>
        Pole {fieldNumber} vlastní <span style={{ color: ownerColor, fontWeight: 700 }}>{ownerName}</span>
      </div>
      <button onClick={() => onCorrect('free')}
        style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
        ○ Uvolnit — nikdo nevlastní
      </button>
      <button onClick={() => onCorrect('p1')}
        style={{ width: '100%', padding: 10, border: 'none', borderRadius: 10, background: 'linear-gradient(135deg, #f97316, #c2410c)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
        🟠 Přiřadit {player1Name || 'Hráči 1'}
      </button>
      <button onClick={() => onCorrect('p2')}
        style={{ width: '100%', padding: 10, border: 'none', borderRadius: 10, background: 'linear-gradient(135deg, #22d3ee, #0e7490)', color: '#042f2e', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
        🔵 Přiřadit {player2Name || 'Hráči 2'}
      </button>
      <button onClick={() => onCorrect('unanswered')}
        style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.07)', color: '#fbbf24', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
        ◈ Nastavit jako neuhodnuté
      </button>
    </>
  )
}

function OfferPhaseButtons({ activePlayer, player1Name, player2Name, onSteal, onStealFailed, onMarkUnanswered }: {
  activePlayer: 1 | 2
  player1Name: string
  player2Name: string
  onSteal: (player: 1 | 2) => void
  onStealFailed: () => void
  onMarkUnanswered: () => void
}) {
  const opponentPlayer = activePlayer === 1 ? 2 : 1
  const opponentName = opponentPlayer === 1 ? (player1Name || 'Hráč 1') : (player2Name || 'Hráč 2')
  const activeName = activePlayer === 1 ? (player1Name || 'Hráč 1') : (player2Name || 'Hráč 2')
  const opponentBg = opponentPlayer === 1
    ? 'linear-gradient(135deg, #f97316, #c2410c)'
    : 'linear-gradient(135deg, #22d3ee, #0e7490)'
  const opponentColor = opponentPlayer === 1 ? 'white' : '#042f2e'
  const opponentEmoji = opponentPlayer === 1 ? '🟠' : '🔵'
  return (
    <>
      <div style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', padding: '4px 0' }}>
        Chce odpovídat {opponentName}?
      </div>
      <button
        onClick={() => onSteal(opponentPlayer)}
        style={{ width: '100%', padding: 12, border: 'none', borderRadius: 10, background: opponentBg, color: opponentColor, fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
        {opponentEmoji} {opponentName} odpověděl správně → hraje {activeName}
      </button>
      <button
        onClick={onStealFailed}
        style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)', color: '#f87171', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
        ✗ {opponentName} odpověděl špatně → hraje {activeName}
      </button>
      <button
        onClick={onMarkUnanswered}
        style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.07)', color: '#fbbf24', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
        ↩ {opponentName} nechce odpovídat → hraje {opponentName}
      </button>
    </>
  )
}

export default function ModeratorPage() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('mod_token'))
  const { gameState, socket } = useGameSocket(token ?? undefined)
  const [question, setQuestion] = useState<Question | null>(null)
  const [startForm, setStartForm] = useState({ p1: '', p2: '', round: 'NUMBERS' as Round })
  const [nextForm, setNextForm] = useState<'NUMBERS' | 'LETTERS' | null>(null)
  const [nextNames, setNextNames] = useState({ p1: '', p2: '' })
  const [offerPhase, setOfferPhase] = useState(false)
  const prevStatus = useRef(gameState.status)
  useEffect(() => {
    if (prevStatus.current === 'FINISHED' && gameState.status !== 'FINISHED') {
      setNextForm(null)
      setNextNames({ p1: '', p2: '' })
    }
    prevStatus.current = gameState.status
  }, [gameState.status])

  useEffect(() => {
    setOfferPhase(false)
  }, [gameState.activeField])

  if (!token) return <PinGate onSuccess={(t) => { localStorage.setItem('mod_token', t); setToken(t) }} />

  async function loadQuestion(fieldNumber: number) {
    if (!token) return
    const res = await fetch(`/api/questions/for-field/${fieldNumber}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) setQuestion(await res.json())
    else setQuestion(null)
  }

  async function loadYesNoQuestion() {
    if (!token) return
    const res = await fetch('/api/questions/yesno/random', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) setQuestion(await res.json())
    else setQuestion(null)
  }

  function handleFieldClick(fieldNumber: number) {
    const isClaimed = gameState.claimedP1.includes(fieldNumber) || gameState.claimedP2.includes(fieldNumber)
    socket?.emit('moderator:selectField', { fieldNumber, autoStartTimer: !isClaimed })
    const isYesNo = gameState.unansweredFields.includes(fieldNumber)
    if (isYesNo) loadYesNoQuestion()
    else loadQuestion(fieldNumber)
  }

  function handleClaim(player: 1 | 2) {
    socket?.emit('moderator:claimField', { player })
    setQuestion(null)
  }

  function handleSkip() {
    socket?.emit('moderator:skipField')
    setQuestion(null)
  }

  function handleStart(e: React.FormEvent) {
    e.preventDefault()
    socket?.emit('moderator:startGame', {
      player1Name: startForm.p1,
      player2Name: startForm.p2,
      round: startForm.round,
    })
  }

  const isWaiting = gameState.status === 'WAITING'
  const isFinished = gameState.status === 'FINISHED'

  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 380px', gridTemplateRows: '48px 1fr', background: '#0d1117', position: 'relative', zIndex: 1 }}>
      {/* Top bar */}
      <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 900, background: 'linear-gradient(135deg, #f97316, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AZkvíz</span>
          <span style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: 20, padding: '2px 10px', fontSize: '0.7rem', fontWeight: 600, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Moderátor</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#475569' }}>
          {isWaiting ? 'Čeká na start' : isFinished ? `Vítěz: ${gameState.winner === 1 ? gameState.player1Name : gameState.player2Name}` : `Kolo ${gameState.round === 'NUMBERS' ? '1' : '2'} — Probíhá`}
        </div>
        <button onClick={() => { localStorage.removeItem('mod_token'); setToken(null) }} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '0.75rem' }}>
          Odhlásit
        </button>
      </div>

      {/* Left: Board */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 12, borderRight: '1px solid rgba(255,255,255,0.07)', gap: 10, overflow: 'hidden' }}>
        <HexBoard gameState={gameState} onFieldClick={gameState.status === 'PLAYING' ? handleFieldClick : undefined} compact />
        {gameState.status === 'PLAYING' && gameState.activePlayer && (
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
            Na tahu: <span style={{ color: gameState.activePlayer === 1 ? '#f97316' : '#22d3ee', fontWeight: 700 }}>
              {gameState.activePlayer === 1 ? gameState.player1Name || 'Hráč 1' : gameState.player2Name || 'Hráč 2'}
            </span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          {[1, 2].map((p) => {
            const name = p === 1 ? gameState.player1Name : gameState.player2Name
            const color = p === 1
              ? { bg: 'rgba(249,115,22,.15)', border: 'rgba(249,115,22,.3)', dot: '#f97316' }
              : { bg: 'rgba(34,211,238,.15)', border: 'rgba(34,211,238,.3)', dot: '#22d3ee' }
            return (
              <div key={p} style={{ flex: 1, borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${color.border}`, background: color.bg, flexDirection: p === 2 ? 'row-reverse' : 'row' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color.dot, boxShadow: `0 0 6px ${color.dot}`, flexShrink: 0 }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9' }}>{name || `Hráč ${p}`}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right: Control panel */}
      <div style={{ display: 'flex', flexDirection: 'column', padding: 16, gap: 12, overflowY: 'auto' }}>
        {isWaiting && (
          <form onSubmit={handleStart} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Nová hra</div>
            <input value={startForm.p1} onChange={e => setStartForm(s => ({ ...s, p1: e.target.value }))} placeholder="Jméno hráče 1" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.08)', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none' }} />
            <input value={startForm.p2} onChange={e => setStartForm(s => ({ ...s, p2: e.target.value }))} placeholder="Jméno hráče 2" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.08)', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none' }} />
            <select value={startForm.round} onChange={e => setStartForm(s => ({ ...s, round: e.target.value as Round }))} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: '0.9rem' }}>
              <option value="NUMBERS">Čísla</option>
              <option value="LETTERS">Písmena</option>
            </select>
            <button type="submit" style={{ padding: '10px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #22c55e, #15803d)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>▶ Spustit hru</button>
          </form>
        )}

        {gameState.status === 'PLAYING' && (
          <>
            {/* Active field display */}
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>Aktivní pole</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ width: 52, height: 60, clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', background: 'linear-gradient(160deg, #fef08a, #fbbf24 55%, #d97706)', color: '#1c0f00', fontWeight: 900, fontSize: '1.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, filter: 'drop-shadow(0 0 10px rgba(251,191,36,0.7))' }}>
                  {gameState.activeField ?? '—'}
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Vybráno</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fde68a' }}>{gameState.activeField ? `Pole ${gameState.activeField}` : 'Klikni na pole'}</div>
                </div>
              </div>
            </div>

            {/* Question display */}
            {question && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Otázka</div>
                  <button
                    onClick={async () => {
                      if (!token || !gameState.activeField) return
                      const res = await fetch(`/api/questions/for-field/${gameState.activeField}/reroll`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` },
                      })
                      if (res.ok) setQuestion(await res.json())
                    }}
                    style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.07)', color: '#fbbf24', fontWeight: 600, cursor: 'pointer', fontSize: '0.72rem' }}>
                    ↺ Jiná otázka
                  </button>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 500, color: '#e2e8f0', lineHeight: 1.5 }}>{question.text}</div>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#22d3ee', letterSpacing: 1, textTransform: 'uppercase', paddingTop: 2, flexShrink: 0 }}>Odpověď</span>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#a5f3fc', lineHeight: 1.4 }}>{question.answer}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {(() => {
              const af = gameState.activeField
              const claimedOwner = af
                ? gameState.claimedP1.includes(af) ? 'p1' as const
                : gameState.claimedP2.includes(af) ? 'p2' as const
                : null
                : null
              if (claimedOwner && af) return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#f59e0b', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Opravit</div>
                  <CorrectionButtons
                    fieldNumber={af}
                    owner={claimedOwner}
                    player1Name={gameState.player1Name}
                    player2Name={gameState.player2Name}
                    onCorrect={(action) => { socket?.emit('moderator:correctField', { action }); setQuestion(null); setOfferPhase(false) }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleSkip} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>⏭ Zavřít</button>
                    <button onClick={() => socket?.emit('moderator:resetGame')} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)', color: '#f87171', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>↺ Reset</button>
                  </div>
                </div>
              )
              return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                {gameState.activeQuestionType === 'yesno' ? 'Ano / Ne otázka' : 'Přiřadit pole'}
              </div>

              {gameState.activeQuestionType === 'yesno' ? (
                // Ano/ne otázka
                <>
                  <button
                    disabled={!gameState.activeField}
                    onClick={() => { socket?.emit('moderator:resolveYesNo', { correct: true }); setQuestion(null) }}
                    style={{ width: '100%', padding: 12, border: 'none', borderRadius: 10, background: 'linear-gradient(135deg, #22c55e, #15803d)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', opacity: gameState.activeField ? 1 : 0.4 }}>
                    ✓ Správně → pole {gameState.activePlayer === 1 ? gameState.player1Name || 'Hráče 1' : gameState.player2Name || 'Hráče 2'}
                  </button>
                  <button
                    disabled={!gameState.activeField}
                    onClick={() => { socket?.emit('moderator:resolveYesNo', { correct: false }); setQuestion(null) }}
                    style={{ width: '100%', padding: 12, border: 'none', borderRadius: 10, background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', opacity: gameState.activeField ? 1 : 0.4 }}>
                    ✗ Špatně → pole {gameState.activePlayer === 1 ? gameState.player2Name || 'Hráče 2' : gameState.player1Name || 'Hráče 1'}
                  </button>
                </>
              ) : offerPhase ? (
                // Nabídka soupeři
                <OfferPhaseButtons
                  activePlayer={gameState.activePlayer as 1 | 2}
                  player1Name={gameState.player1Name}
                  player2Name={gameState.player2Name}
                  onSteal={(player) => { socket?.emit('moderator:stealField', { player }); setQuestion(null); setOfferPhase(false) }}
                  onStealFailed={() => { socket?.emit('moderator:stealFailed'); setQuestion(null); setOfferPhase(false) }}
                  onMarkUnanswered={() => { socket?.emit('moderator:markUnanswered'); setQuestion(null); setOfferPhase(false) }}
                />
              ) : (
                // Normální otázka — fáze 1
                <>
                  <button
                    disabled={!gameState.activeField}
                    onClick={() => handleClaim(gameState.activePlayer as 1 | 2)}
                    style={{ width: '100%', padding: 12, border: 'none', borderRadius: 10, background: gameState.activePlayer === 1 ? 'linear-gradient(135deg, #f97316, #c2410c)' : 'linear-gradient(135deg, #22d3ee, #0e7490)', color: gameState.activePlayer === 1 ? 'white' : '#042f2e', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem', opacity: gameState.activeField ? 1 : 0.4 }}>
                    {gameState.activePlayer === 1 ? '🟠' : '🔵'} {gameState.activePlayer === 1 ? gameState.player1Name || 'Hráč 1' : gameState.player2Name || 'Hráč 2'} odpověděl správně
                  </button>
                  <button
                    disabled={!gameState.activeField}
                    onClick={() => setOfferPhase(true)}
                    style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', opacity: gameState.activeField ? 1 : 0.4 }}>
                    ✗ {gameState.activePlayer === 1 ? gameState.player1Name || 'Hráč 1' : gameState.player2Name || 'Hráč 2'} odpověděl špatně
                  </button>
                </>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSkip} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>⏭ Přeskočit</button>
                <button onClick={() => socket?.emit('moderator:resetGame')} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)', color: '#f87171', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>↺ Reset</button>
              </div>
            </div>
              )
            })()}
          </>
        )}

        {isFinished && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ textAlign: 'center', padding: '16px 0', color: '#fbbf24', fontSize: '1.2rem', fontWeight: 700 }}>
              🏆 Vyhrál {gameState.winner === 1 ? gameState.player1Name : gameState.player2Name}!
            </div>

            {nextForm === 'NUMBERS' ? (
              <form onSubmit={(e) => { e.preventDefault(); socket?.emit('moderator:startGame', { player1Name: nextNames.p1, player2Name: nextNames.p2, round: 'NUMBERS' }) }}
                style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Semifinále — Čísla</div>
                <input value={nextNames.p1} onChange={e => setNextNames(s => ({ ...s, p1: e.target.value }))} placeholder="Jméno týmu 1" required
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.08)', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none' }} />
                <input value={nextNames.p2} onChange={e => setNextNames(s => ({ ...s, p2: e.target.value }))} placeholder="Jméno týmu 2" required
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.08)', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => setNextForm(null)}
                    style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem' }}>Zrušit</button>
                  <button type="submit"
                    style={{ flex: 2, padding: 10, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #22c55e, #15803d)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>▶ Spustit</button>
                </div>
              </form>
            ) : (
              <button onClick={() => { setNextForm('NUMBERS'); setNextNames({ p1: '', p2: '' }) }}
                style={{ width: '100%', padding: 12, border: 'none', borderRadius: 10, background: 'linear-gradient(135deg, #22c55e, #15803d)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
                ▶ Další semifinále (Čísla)
              </button>
            )}

            {nextForm === 'LETTERS' ? (
              <form onSubmit={(e) => { e.preventDefault(); socket?.emit('moderator:startGame', { player1Name: nextNames.p1, player2Name: nextNames.p2, round: 'LETTERS' }) }}
                style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Finále — Písmena</div>
                <input value={nextNames.p1} onChange={e => setNextNames(s => ({ ...s, p1: e.target.value }))} placeholder="Jméno finalisty 1" required
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.08)', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none' }} />
                <input value={nextNames.p2} onChange={e => setNextNames(s => ({ ...s, p2: e.target.value }))} placeholder="Jméno finalisty 2" required
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.08)', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => setNextForm(null)}
                    style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem' }}>Zrušit</button>
                  <button type="submit"
                    style={{ flex: 2, padding: 10, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #6366f1, #4338ca)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>🏆 Spustit finále</button>
                </div>
              </form>
            ) : (
              <button onClick={() => { setNextForm('LETTERS'); setNextNames({ p1: '', p2: '' }) }}
                style={{ width: '100%', padding: 12, border: 'none', borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #4338ca)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
                🏆 Finále (Písmena)
              </button>
            )}

            <button onClick={() => socket?.emit('moderator:resetGame')}
              style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)', color: '#f87171', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
              ↺ Nová hra od začátku
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
