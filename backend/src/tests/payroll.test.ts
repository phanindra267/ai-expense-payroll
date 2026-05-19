import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import Employee from '../models/Employee';

let mongoServer: MongoMemoryServer;
let token: string;
let orgId: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  const res = await request(app).post('/api/auth/register').send({ orgName: 'PayOrg', email: 'admin@pay.com', password: 'password123' });
  token = res.body.accessToken;
  orgId = res.body.user.organisationId;

  // Seed employees with adjustments
  await Employee.create([
    { name: 'Alice', email: 'alice@pay.com', department: 'Eng', baseSalary: 80000, organisationId: orgId,
      monthlyAdjustments: [{ month: '2025-01', type: 'bonus', amount: 5000, reason: 'Q4' }, { month: '2025-01', type: 'leave', amount: 2000 }] },
    { name: 'Bob', email: 'bob@pay.com', department: 'Sales', baseSalary: 60000, organisationId: orgId,
      monthlyAdjustments: [{ month: '2025-01', type: 'overtime', amount: 3000 }] },
  ]);
});
afterAll(async () => { await mongoose.disconnect(); await mongoServer.stop(); });

describe('Payroll — Processing', () => {
  it('processes payroll for all employees', async () => {
    const res = await request(app).post('/api/payroll/process').set('Authorization', `Bearer ${token}`)
      .send({ month: '2025-01' });
    expect(res.status).toBe(201);
    expect(res.body.count).toBe(2);
  });

  it('calculates net pay correctly', async () => {
    const list = await request(app).get('/api/payroll?month=2025-01').set('Authorization', `Bearer ${token}`);
    const alice = list.body.find((p: any) => p.employeeId?.name === 'Alice');
    // 80000 + 5000 (bonus) - 2000 (leave) = 83000
    expect(alice?.netPay).toBe(83000);
    const bob = list.body.find((p: any) => p.employeeId?.name === 'Bob');
    // 60000 + 3000 (overtime) = 63000
    expect(bob?.netPay).toBe(63000);
  });

  it('starts in draft status', async () => {
    const list = await request(app).get('/api/payroll?month=2025-01').set('Authorization', `Bearer ${token}`);
    expect(list.body.every((p: any) => p.status === 'draft')).toBe(true);
  });
});

describe('Payroll — Status Transitions', () => {
  let payrollId: string;

  beforeAll(async () => {
    const list = await request(app).get('/api/payroll?month=2025-01').set('Authorization', `Bearer ${token}`);
    payrollId = list.body[0]._id;
  });

  it('transitions draft → audited', async () => {
    const res = await request(app).put(`/api/payroll/${payrollId}/status`).set('Authorization', `Bearer ${token}`)
      .send({ status: 'audited' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('audited');
  });

  it('transitions audited → approved', async () => {
    const res = await request(app).put(`/api/payroll/${payrollId}/status`).set('Authorization', `Bearer ${token}`)
      .send({ status: 'approved' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
  });

  it('rejects invalid transition approved → draft', async () => {
    const res = await request(app).put(`/api/payroll/${payrollId}/status`).set('Authorization', `Bearer ${token}`)
      .send({ status: 'draft' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_TRANSITION');
  });

  it('records audit log', async () => {
    const list = await request(app).get(`/api/payroll?month=2025-01`).set('Authorization', `Bearer ${token}`);
    const p = list.body.find((x: any) => x._id === payrollId);
    expect(p.auditLog.length).toBeGreaterThanOrEqual(2);
  });
});
