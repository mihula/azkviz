import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth'
import questionsRouter from './routes/questions'

export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json())
  app.use('/api/auth', authRouter)
  app.use('/api/questions', questionsRouter)
  return app
}
