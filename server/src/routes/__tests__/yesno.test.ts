import { describe, it, expect, beforeAll, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../../createApp'
import { Application } from 'express'

vi.mock('../../services/yesNoService', () => ({
  listYesNoQuestions: vi.fn().mockResolvedValue([
    { id: 1, text: 'Otázka?', answer: 'Ano' },
  ]),
  getRandomYesNoQuestion: vi.fn().mockResolvedValue({ id: 1, text: 'Otázka?', answer: 'Ano' }),
  createYesNoQuestion: vi.fn().mockResolvedValue({ id: 2, text: 'Nová?', answer: 'Ne' }),
  updateYesNoQuestion: vi.fn().mockResolvedValue({ id: 1, text: 'Upravená?', answer: 'Ano' }),
  deleteYesNoQuestion: vi.fn().mockResolvedValue(undefined),
  importYesNoQuestions: vi.fn().mockResolvedValue(3),
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

describe('GET /api/questions/yesno', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/questions/yesno')
    expect(res.status).toBe(401)
  })

  it('returns list with token', async () => {
    const res = await request(app)
      .get('/api/questions/yesno')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].answer).toBe('Ano')
  })
})

describe('GET /api/questions/yesno/random', () => {
  it('returns a random question', async () => {
    const res = await request(app)
      .get('/api/questions/yesno/random')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.text).toBe('Otázka?')
    expect(res.body.answer).toBe('Ano')
  })
})

describe('POST /api/questions/yesno', () => {
  it('creates a question', async () => {
    const res = await request(app)
      .post('/api/questions/yesno')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'Nová?', answer: 'Ne' })
    expect(res.status).toBe(201)
    expect(res.body.id).toBe(2)
  })
})

describe('PUT /api/questions/yesno/:id', () => {
  it('updates a question', async () => {
    const res = await request(app)
      .put('/api/questions/yesno/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'Upravená?' })
    expect(res.status).toBe(200)
    expect(res.body.text).toBe('Upravená?')
  })
})

describe('DELETE /api/questions/yesno/:id', () => {
  it('deletes a question', async () => {
    const res = await request(app)
      .delete('/api/questions/yesno/1')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(204)
  })
})

describe('POST /api/questions/yesno/import', () => {
  it('returns count of imported questions', async () => {
    const res = await request(app)
      .post('/api/questions/yesno/import')
      .set('Authorization', `Bearer ${token}`)
      .send([{ text: 'Q1', answer: 'Ano' }])
    expect(res.status).toBe(200)
    expect(res.body.imported).toBe(3)
  })

  it('returns 400 for non-array payload', async () => {
    const res = await request(app)
      .post('/api/questions/yesno/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ invalid: true })
    expect(res.status).toBe(400)
  })
})
