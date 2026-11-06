/**
 * Authentication API tests.
 */
const request = require('supertest');
const app = require('../src/app');

const validUser = { name: 'Rahim Uddin', email: 'rahim@example.com', password: 'Password123' };

describe('Auth API', () => {
  test('POST /api/auth/register - registers a new user (201) and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('rahim@example.com');
    // The password (or its hash) must NEVER appear in a response.
    expect(res.body.data.user.password).toBeUndefined();
  });

  test('POST /api/auth/register - duplicate email returns 409', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app).post('/api/auth/register').send(validUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/auth/register - invalid payload returns 400 with field errors', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'A',
      email: 'not-an-email',
      password: 'short',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThanOrEqual(3);
  });

  test('POST /api/auth/register - empty body returns 400', async () => {
    const res = await request(app).post('/api/auth/register').send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/auth/login - correct credentials return a token (200)', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.password).toBeUndefined();
  });

  test('POST /api/auth/login - wrong password returns 401', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: 'WrongPassword1' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/auth/login - unknown email returns 401 (same message as wrong password)', async () => {
    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'Whatever123' });
    await request(app).post('/api/auth/register').send(validUser);
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: 'WrongPassword1' });

    expect(unknown.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
    expect(unknown.body.message).toBe(wrongPassword.body.message);
  });

  test('GET /api/auth/me - 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/auth/me - 401 with a malformed token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');

    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me - 200 with a valid token and returns the right user', async () => {
    const register = await request(app).post('/api/auth/register').send(validUser);
    const token = register.body.data.token;

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(validUser.email);
    expect(res.body.data.user.password).toBeUndefined();
  });
});
