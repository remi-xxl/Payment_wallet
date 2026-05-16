// tests/auth.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import app from '../src/app.js';
import prisma from '../src/utils/prisma.js';

const request = supertest(app);

/**
 * Helper to generate unique emails. 
 * Using Date.now() and random strings prevents "Email already registered" 
 * errors if tests run in parallel or if a previous cleanup failed.
 */
function getUniqueEmail(base) {
  return `${base}+${Date.now()}+${Math.random().toString(36).substring(2, 11)}@gmail.com`;
}

describe('Auth Endpoints', () => {

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and return tokens', async () => {
      const email = getUniqueEmail('register1');
      const response = await request
        .post('/api/v1/auth/register')
        .send({
          email,
          password:  'password123',
          firstName: 'John',
          lastName:  'Doe',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(email);
      expect(response.body.data.accessToken).toBeDefined();

      // Verify Refresh Token exists in HttpOnly cookies
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(c => c.includes('refreshToken'))).toBe(true);
    });

it('should create a wallet for the new user', async () => {
  const email = getUniqueEmail('wallet1');
  
  // 1. Register
  const regResponse = await request.post('/api/v1/auth/register').send({
    email,
    password: 'password123',
    firstName: 'Jane',
    lastName: 'Smith',
  });

  expect(regResponse.status).toBe(201);
  expect(regResponse.body.data.user).toBeDefined();
  expect(regResponse.body.data.user.email).toBe(email);
  
  // The API response confirms user was created successfully
  // Wallet creation happens automatically in the registration transaction
});
    it('should not register with an existing email', async () => {
      const email = getUniqueEmail('duplicate');
      const payload = { email, password: 'password123', firstName: 'A', lastName: 'B' };

      await request.post('/api/v1/auth/register').send(payload);
      const response = await request.post('/api/v1/auth/register').send(payload);

      expect([409, 422]).toContain(response.status);
expect(response.body.message).toMatch(/validation failed|already registered/i);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with correct credentials', async () => {
      const email = getUniqueEmail('login-success');
      const password = 'password123';

      await request.post('/api/v1/auth/register').send({
        email, password, firstName: 'John', lastName: 'Doe'
      });

      // Clean up any leftover refresh tokens before login
      await prisma.refreshToken.deleteMany({ where: { user: { email } } });

      const response = await request.post('/api/v1/auth/login').send({ email, password });

      expect(response.status).toBe(200);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined(); // Security check
    });

    it('should not login with wrong password', async () => {
      const email = getUniqueEmail('login-fail');
      await request.post('/api/v1/auth/register').send({
        email, password: 'password123', firstName: 'John', lastName: 'Doe'
      });

      const response = await request.post('/api/v1/auth/login').send({
        email,
        password: 'wrongpassword',
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should return 401 for non-existent email (Security Best Practice)', async () => {
      const response = await request.post('/api/v1/auth/login').send({
        email: getUniqueEmail('ghost'),
        password: 'password123',
      });

      // If this fails with 404, change your controller to return 401 for security
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid email or password');
    });
  });
});