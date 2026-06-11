import { LETTERS_MAP } from 'azkivz-shared'
import type { Round } from 'azkivz-shared'

type CellState = 'free' | 'active' | 'p1' | 'p2'

interface HexCellProps {
  fieldNumber: number
  round: Round
  state: CellState
  onClick?: (fieldNumber: number) => void
  style?: React.CSSProperties
}

export default function HexCell({ fieldNumber, round, state, onClick, style }: HexCellProps) {
  const label = round === 'LETTERS' ? LETTERS_MAP[fieldNumber] : String(fieldNumber)

  return (
    <div
      className={`hex ${state}`}
      data-field={fieldNumber}
      style={style}
      onClick={() => onClick?.(fieldNumber)}
    >
      {label}
    </div>
  )
}
