import { GameState } from 'azkivz-shared'
import HexCell from './HexCell'
import { useEffect, useState } from 'react'

interface HexBoardProps {
  gameState: GameState
  onFieldClick?: (fieldNumber: number) => void
  compact?: boolean
}

function calcHexSize(compact: boolean) {
  if (compact) return { hexW: 52, hexH: 60, gap: 6, fontSize: 20 }
  if (typeof window === 'undefined') return { hexW: 52, hexH: 60, gap: 6, fontSize: 20 }
  const GAP = 10
  const nonBoardH = 168
  const availH = window.innerHeight - nonBoardH
  const availW = window.innerWidth - 352  // subtract timer hex placeholders (2 × 140 + 2 × 24 gap + 24 outer padding)
  const hexHfromH = availH / 5.5
  const hexHfromW = (availW - 6 * GAP) / (7 * 0.866)
  const hexH = Math.floor(Math.min(hexHfromH, hexHfromW))
  return { hexW: Math.floor(hexH * 0.866), hexH, gap: GAP, fontSize: Math.floor(hexH * 0.44) }
}

export default function HexBoard({ gameState, onFieldClick, compact = false }: HexBoardProps) {
  const [size, setSize] = useState(() => calcHexSize(compact))

  useEffect(() => {
    if (compact) return
    const handle = () => setSize(calcHexSize(false))
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [compact])

  const { hexW, hexH, gap, fontSize } = size
  const overlap = Math.floor(hexH * 0.25)

  const rows: number[][] = []
  let field = 1
  for (let r = 0; r < 7; r++) {
    const row: number[] = []
    for (let c = 0; c <= r; c++) row.push(field++)
    rows.push(row)
  }

  function cellState(f: number): 'free' | 'active' | 'p1' | 'p2' | 'unanswered' {
    if (f === gameState.activeField) return 'active'
    if (gameState.claimedP1.includes(f)) return 'p1'
    if (gameState.claimedP2.includes(f)) return 'p2'
    if (gameState.unansweredFields?.includes(f)) return 'unanswered'
    return 'free'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {rows.map((row, ri) => (
        <div
          key={ri}
          style={{
            display: 'flex',
            gap: `${gap}px`,
            marginTop: ri === 0 ? 0 : `-${overlap}px`,
          }}
        >
          {row.map((f) => (
            <HexCell
              key={f}
              fieldNumber={f}
              round={gameState.round}
              state={cellState(f)}
              onClick={onFieldClick}
              style={{ width: hexW, height: hexH, fontSize }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
