import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import User from '../models/User';
import Organisation from '../models/Organisation';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
  await Organisation.deleteMany({});
});

describe('Auth — Register', () => {
  it('registers a new organisation + admin user', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ orgName: 'Acme Corp', email: 'admin@acme.com', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.email).toBe('admin@acme.com');
    expect(res.body.user.role).toBe('admin');
  });

  it('rejects duplicate email', async () => {
    await request(app).post('/api/auth/register').send({ orgName: 'Acme', email: 'dup@acme.com', password: 'password123' });
    const res = await request(app).post('/api/auth/register').send({ orgName: 'Beta', email: 'dup@acme.com', password: 'password123' });
    expect(res.status).toBe(409);
  });

  it('requires all fields', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
  });
});

describe('Auth — Login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({ orgName: 'TestOrg', email: 'user@test.com', password: 'password123' });
  });

  it('logs in with valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'user@test.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('rejects invalid password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'user@test.com', password: 'wrongpass' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@test.com', password: 'pass' });
    expect(res.status).toBe(401);
  });
});

describe('Auth — Refresh Token Rotation', () => {
  let refreshToken: string;
  let accessToken: string;

  beforeEach(async () => {
    const reg = await request(app).post('/api/auth/register').send({ orgName: 'Org', email: 'rf@test.com', password: 'password123' });
    refreshToken = reg.body.refreshToken;
    accessToken = reg.body.accessToken;
  });

  it('issues new tokens on valid refresh', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.refreshToken).not.toBe(refreshToken);
  });

  it('detects refresh token reuse and revokes all sessions', async () => {
    const res1 = await request(app).post('/api/auth/refresh').send({ refreshToken });
    // Use original token again (reuse)
    const res2 = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res2.status).toBe(401);
    expect(res2.body.code).toBe('TOKEN_REUSE');
    // New token from res1 should also be revoked
    const res3 = await request(app).post('/api/auth/refresh').send({ refreshToken: res1.body.refreshToken });
    expect(res3.status).toBe(401);
  });

  it('rejects invalid refresh tokens', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'invalid.token.here' });
    expect(res.status).toBe(401);
  });
});

describe('Auth — Logout', () => {
  it('logs out and invalidates refresh token', async () => {
    const reg = await request(app).post('/api/auth/register').send({ orgName: 'Org', email: 'lo@test.com', password: 'password123' });
    const { refreshToken } = reg.body;
    await request(app).post('/api/auth/logout').send({ refreshToken });
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(401);
  });
});
