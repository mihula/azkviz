import { Server, Socket } from 'socket.io'
import { ServerToClientEvents, ClientToServerEvents } from 'azkivz-shared'
import {
  getGameState,
  startGame,
  selectField,
  claimField,
  stealField,
  stealFailed,
  markUnanswered,
  correctField,
  resolveYesNo,
  startTimer,
  skipField,
  resetGame,
} from '../services/gameService'
import jwt from 'jsonwebtoken'

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>

function isModeratorSocket(socket: TypedSocket): boolean {
  const token = socket.handshake.auth.token as string | undefined
  if (!token) return false
  try {
    jwt.verify(token, process.env.JWT_SECRET!)
    return true
  } catch {
    return false
  }
}

async function broadcast(io: TypedServer) {
  const state = await getGameState()
  io.emit('game:update', state)
}

export function registerGameHandlers(io: TypedServer, socket: TypedSocket) {
  const isMod = isModeratorSocket(socket)

  getGameState().then((state) => socket.emit('game:update', state))

  if (!isMod) return

  socket.on('moderator:startGame', async ({ player1Name, player2Name, round }) => {
    await startGame(player1Name, player2Name, round)
    await broadcast(io)
  })

  socket.on('moderator:selectField', async ({ fieldNumber, autoStartTimer }) => {
    await selectField(fieldNumber, autoStartTimer)
    await broadcast(io)
  })

  socket.on('moderator:claimField', async ({ player }) => {
    await claimField(player)
    await broadcast(io)
  })

  socket.on('moderator:stealField', async ({ player }) => {
    await stealField(player)
    await broadcast(io)
  })

  socket.on('moderator:markUnanswered', async () => {
    await markUnanswered()
    await broadcast(io)
  })

  socket.on('moderator:stealFailed', async () => {
    await stealFailed()
    await broadcast(io)
  })

  socket.on('moderator:correctField', async ({ action }) => {
    await correctField(action)
    await broadcast(io)
  })

  socket.on('moderator:resolveYesNo', async ({ correct }) => {
    await resolveYesNo(correct)
    await broadcast(io)
  })

  socket.on('moderator:startTimer', async () => {
    await startTimer()
    await broadcast(io)
  })

  socket.on('moderator:skipField', async () => {
    await skipField()
    await broadcast(io)
  })

  socket.on('moderator:resetGame', async () => {
    await resetGame()
    await broadcast(io)
  })
}
