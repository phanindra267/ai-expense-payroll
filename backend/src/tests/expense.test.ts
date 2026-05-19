import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';

let mongoServer: MongoMemoryServer;
let token: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  const res = await request(app).post('/api/auth/register').send({ orgName: 'ExpOrg', email: 'admin@expense.com', password: 'password123' });
  token = res.body.accessToken;
});
afterAll(async () => { await mongoose.disconnect(); await mongoServer.stop(); });

describe('Expenses — CRUD', () => {
  let expId: string;

  it('creates an expense', async () => {
    const res = await request(app).post('/api/expenses').set('Authorization', `Bearer ${token}`)
      .send({ description: 'Team lunch', amount: 2500, date: '2025-01-15', vendor: 'The Grand', paymentMethod: 'Credit Card' });
    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(2500);
    expId = res.body._id;
  });

  it('lists expenses', async () => {
    const res = await request(app).get('/api/expenses').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('filters by month', async () => {
    const res = await request(app).get('/api/expenses?month=2025-01').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('gets expense by id', async () => {
    const res = await request(app).get(`/api/expenses/${expId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(expId);
  });

  it('updates expense', async () => {
    const res = await request(app).put(`/api/expenses/${expId}`).set('Authorization', `Bearer ${token}`)
      .send({ vendor: 'Updated Vendor' });
    expect(res.status).toBe(200);
    expect(res.body.vendor).toBe('Updated Vendor');
  });

  it('deletes expense', async () => {
    const res = await request(app).delete(`/api/expenses/${expId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('requires description, amount, date', async () => {
    const res = await request(app).post('/api/expenses').set('Authorization', `Bearer ${token}`)
      .send({ vendor: 'NoName' });
    expect(res.status).toBe(400);
  });
});

describe('Expenses — Idempotency', () => {
  it('returns cached response on duplicate idempotency key', async () => {
    const key = `test-key-${Date.now()}`;
    const headers = { Authorization: `Bearer ${token}`, 'Idempotency-Key': key };
    const body = { description: 'Duplicate test', amount: 100, date: '2025-02-01' };

    const res1 = await request(app).post('/api/expenses').set(headers).send(body);
    expect(res1.status).toBe(201);

    const res2 = await request(app).post('/api/expenses').set(headers).send(body);
    expect(res2.status).toBe(201);
    expect(res2.body._id).toBe(res1.body._id);
  });
});
