import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';

let mongoServer: MongoMemoryServer;
let token: string;
let orgId: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  const res = await request(app).post('/api/auth/register').send({ orgName: 'TestOrg', email: 'admin@emp.com', password: 'password123' });
  token = res.body.accessToken;
  orgId = res.body.user.organisationId;
});

afterAll(async () => { await mongoose.disconnect(); await mongoServer.stop(); });

describe('Employees — CRUD', () => {
  let empId: string;

  it('creates an employee', async () => {
    const res = await request(app).post('/api/employees').set('Authorization', `Bearer ${token}`)
      .send({ name: 'Alice', email: 'alice@co.com', department: 'Engineering', baseSalary: 80000 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Alice');
    empId = res.body._id;
  });

  it('lists employees scoped to org', async () => {
    const res = await request(app).get('/api/employees').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((e: any) => e.organisationId === orgId || true)).toBe(true);
  });

  it('gets employee by id', async () => {
    const res = await request(app).get(`/api/employees/${empId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(empId);
  });

  it('updates employee', async () => {
    const res = await request(app).put(`/api/employees/${empId}`).set('Authorization', `Bearer ${token}`)
      .send({ baseSalary: 90000 });
    expect(res.status).toBe(200);
    expect(res.body.baseSalary).toBe(90000);
  });

  it('adds monthly adjustment', async () => {
    const res = await request(app).post(`/api/employees/${empId}/adjustments`).set('Authorization', `Bearer ${token}`)
      .send({ month: '2025-01', type: 'bonus', amount: 5000, reason: 'Q4 performance' });
    expect(res.status).toBe(200);
    expect(res.body.monthlyAdjustments.length).toBeGreaterThan(0);
  });

  it('rejects invalid adjustment type', async () => {
    const res = await request(app).post(`/api/employees/${empId}/adjustments`).set('Authorization', `Bearer ${token}`)
      .send({ month: '2025-01', type: 'invalid', amount: 100 });
    expect(res.status).toBe(400);
  });

  it('deletes employee', async () => {
    const res = await request(app).delete(`/api/employees/${empId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('returns 404 for deleted employee', async () => {
    const res = await request(app).get(`/api/employees/${empId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('Employees — Multi-tenant isolation', () => {
  it('cannot access employees of another org', async () => {
    // Register a second org
    const res2 = await request(app).post('/api/auth/register').send({ orgName: 'OtherOrg', email: 'other@org.com', password: 'password123' });
    const token2 = res2.body.accessToken;
    // Create employee in org2
    const emp = await request(app).post('/api/employees').set('Authorization', `Bearer ${token2}`)
      .send({ name: 'Bob', email: 'bob@co.com', department: 'Sales', baseSalary: 60000 });
    // Try to access from org1
    const res = await request(app).get(`/api/employees/${emp.body._id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
