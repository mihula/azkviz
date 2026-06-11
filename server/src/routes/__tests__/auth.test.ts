import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../../createApp'
import { Application } from 'express'

let app: Application

beforeAll(() => {
  process.env.MODERATOR_PIN = 'test1234'
  process.env.JWT_SECRET = 'test-secret'
  app = createApp()
})

describe('POST /api/auth/login', () => {
  it('returns 200 and token with correct PIN', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ pin: 'test1234' })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeTruthy()
  })

  it('returns 401 with wrong PIN', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ pin: 'wrong' })
    expect(res.status).toBe(401)
  })

  it('returns 400 with missing PIN', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({})
    expect(res.status).toBe(400)
  })
})
