// server/src/routes/__tests__/questions.test.ts
import { describe, it, expect, beforeAll, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../../createApp'
import { Application } from 'express'

vi.mock('../../services/questionService', () => ({
  listQuestions: vi.fn().mockResolvedValue([
    { id: 1, round: 'NUMBERS', fieldNumber: 1, text: 'Otázka?', answer: 'Odpověď' },
  ]),
  createQuestion: vi.fn().mockResolvedValue(
    { id: 2, round: 'NUMBERS', fieldNumber: 2, text: 'Nová?', answer: 'Nová' }
  ),
  updateQuestion: vi.fn().mockResolvedValue(
    { id: 1, round: 'NUMBERS', fieldNumber: 1, text: 'Upravená?', answer: 'Upravená' }
  ),
  deleteQuestion: vi.fn().mockResolvedValue(undefined),
  importQuestions: vi.fn().mockResolvedValue(3),
  getQuestionForField: vi.fn().mockResolvedValue(null),
}))

let app: Application
let token: string

beforeAll(async () => {
  process.env.MODERATOR_PIN = 'test1234'
  process.env.JWT_SECRET = 'test-secret'
  app = createApp()
  const res = await request(app).post('/api/auth/login').send({ pin: 'test1234' })
  token = res.body.token
})

describe('GET /api/questions', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/questions')
    expect(res.status).toBe(401)
  })

  it('returns questions list with token', async () => {
    const res = await request(app)
      .get('/api/questions')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].text).toBe('Otázka?')
  })
})

describe('POST /api/questions/import', () => {
  it('returns count of imported questions', async () => {
    const payload = [
      { round: 'NUMBERS', fieldNumber: 1, text: 'Q1', answer: 'A1' },
    ]
    const res = await request(app)
      .post('/api/questions/import')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
    expect(res.status).toBe(200)
    expect(res.body.imported).toBe(3)
  })

  it('returns 400 for non-array payload', async () => {
    const res = await request(app)
      .post('/api/questions/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ invalid: true })
    expect(res.status).toBe(400)
  })
})
