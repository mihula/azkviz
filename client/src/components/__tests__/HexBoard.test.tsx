import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HexBoard from '../HexBoard'
import { GameState } from 'azkivz-shared'

const baseState: GameState = {
  id: 1,
  status: 'PLAYING',
  round: 'NUMBERS',
  player1Name: 'Jakub',
  player2Name: 'Lukáš',
  activeField: null,
  claimedP1: [],
  claimedP2: [],
  winner: null,
  updatedAt: new Date().toISOString(),
  activePlayer: 1,
  unansweredFields: [],
  activeQuestionType: null,
  timerStartedAt: null,
}

describe('HexBoard', () => {
  it('renders 28 cells', () => {
    render(<HexBoard gameState={baseState} />)
    const cells = document.querySelectorAll('[data-field]')
    expect(cells).toHaveLength(28)
  })

  it('shows numbers 1-28 in NUMBERS round', () => {
    render(<HexBoard gameState={baseState} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('28')).toBeInTheDocument()
  })

  it('shows letters in LETTERS round', () => {
    render(<HexBoard gameState={{ ...baseState, round: 'LETTERS' }} />)
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('Ž')).toBeInTheDocument()
  })

  it('calls onFieldClick when cell is clicked (if provided)', async () => {
    const onFieldClick = vi.fn()
    render(<HexBoard gameState={baseState} onFieldClick={onFieldClick} />)
    await userEvent.click(screen.getByText('5'))
    expect(onFieldClick).toHaveBeenCalledWith(5)
  })

  it('marks active field', () => {
    render(<HexBoard gameState={{ ...baseState, activeField: 13 }} />)
    const cell = document.querySelector('[data-field="13"]')
    expect(cell).toHaveClass('active')
  })

  it('marks p1 and p2 claimed fields', () => {
    render(<HexBoard gameState={{ ...baseState, claimedP1: [1, 2], claimedP2: [3] }} />)
    expect(document.querySelector('[data-field="1"]')).toHaveClass('p1')
    expect(document.querySelector('[data-field="3"]')).toHaveClass('p2')
  })

  it('marks unanswered fields', () => {
    render(<HexBoard gameState={{ ...baseState, unansweredFields: [7, 8] } as any} />)
    expect(document.querySelector('[data-field="7"]')).toHaveClass('unanswered')
    expect(document.querySelector('[data-field="8"]')).toHaveClass('unanswered')
    expect(document.querySelector('[data-field="9"]')).not.toHaveClass('unanswered')
  })
})
