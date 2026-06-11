import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.join(__dirname, '../../.env') })

import http from 'http'
import { Server } from 'socket.io'
import { ServerToClientEvents, ClientToServerEvents } from 'azkivz-shared'
import { createApp } from './createApp'
import { registerGameHandlers } from './socket/gameHandler'
import prisma from './lib/prisma'

const PORT = Number(process.env.PORT) || 3001

async function main() {
  // Ensure GameState singleton exists
  await prisma.gameState.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  })

  const app = createApp()
  const httpServer = http.createServer(app)

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: '*' },
  })

  io.on('connection', (socket) => {
    registerGameHandlers(io, socket)
  })

  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

main().catch(console.error)
