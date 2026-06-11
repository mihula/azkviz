import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { GameState, ServerToClientEvents, ClientToServerEvents } from 'azkivz-shared'

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>

const INITIAL_STATE: GameState = {
  id: 1,
  status: 'WAITING',
  round: 'NUMBERS',
  player1Name: '',
  player2Name: '',
  activeField: null,
  claimedP1: [],
  claimedP2: [],
  winner: null,
  updatedAt: new Date().toISOString(),
}

export function useGameSocket(token?: string) {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE)
  const [socket, setSocket] = useState<GameSocket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const s: GameSocket = io('/', {
      auth: token ? { token } : {},
    })

    s.on('connect', () => setConnected(true))
    s.on('disconnect', () => setConnected(false))
    s.on('game:update', (state) => setGameState(state))

    setSocket(s)
    return () => { s.disconnect() }
  }, [token])

  return { gameState, socket, connected }
}
