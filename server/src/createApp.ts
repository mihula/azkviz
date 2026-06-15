import express, { Application } from 'express'
import cors from 'cors'
import path from 'path'
import { Server } from 'socket.io'
import { ServerToClientEvents, ClientToServerEvents } from 'azkivz-shared'
import authRouter from './routes/auth'
import { createQuestionsRouter } from './routes/questions'
import gameRouter from './routes/game'
import yesnoRouter from './routes/yesno'

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>

export function createApp(io?: TypedServer): Application {
  const app = express()
  app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }))
  app.use(express.json({ limit: '2mb' }))

  app.use('/api/auth', authRouter)
  app.use('/api/questions/yesno', yesnoRouter)
  app.use('/api/questions', createQuestionsRouter(io!))
  app.use('/api/game', gameRouter)

  // Serve React build in production
  if (process.env.NODE_ENV === 'production') {
    const clientBuild = path.join(__dirname, '../../client/dist')
    app.use(express.static(clientBuild))
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientBuild, 'index.html'))
    })
  }

  return app
}
