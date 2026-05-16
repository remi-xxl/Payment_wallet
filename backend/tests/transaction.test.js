// tests/transaction.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import app from '../src/app.js';
import prisma from '../src/utils/prisma.js';

const request = supertest(app);

// Generate unique email to avoid conflicts in parallel tests
function getUniqueEmail(base) {
  return `${base}+${Date.now()}+${Math.random().toString(36).substr(2, 9)}@gmail.com`;
}

// Helper: register a user and return their access token
async function registerUser(email, firstName = 'John', lastName = 'Doe') {
  const res = await request
    .post('/api/v1/auth/register')
    .send({
      email,
      password:  'password123',
      firstName,
      lastName,
    });
  
  if (!res.body.success || !res.body.data?.accessToken) {
    throw new Error(`Registration failed for ${email}: ${JSON.stringify(res.body)}`);
  }
  
  return { accessToken: res.body.data.accessToken, email };
}

describe('Transaction Endpoints', () => {

  describe('POST /api/v1/transactions/transfer', () => {

    it('should not transfer without authentication', async () => {
      const response = await request
        .post('/api/v1/transactions/transfer')
        .send({
          recipientEmail: getUniqueEmail('recipient'),
          amount:         500,
          description:    'For lunch',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/transactions/history', () => {

    it('should return transaction history for authenticated user', async () => {
      const user = await registerUser(getUniqueEmail('history'), 'Hist', 'User');

      const response = await request
        .get('/api/v1/transactions/history')
        .set('Authorization', `Bearer ${user.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toBeDefined();
      expect(Array.isArray(response.body.data.transactions)).toBe(true);
    });

    it('should not return history without authentication', async () => {
      const response = await request
        .get('/api/v1/transactions/history');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return empty history for new user with no transactions', async () => {
      const user = await registerUser(getUniqueEmail('notrans'), 'No', 'Trans');

      const response = await request
        .get('/api/v1/transactions/history')
        .set('Authorization', `Bearer ${user.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions.length).toBe(0);
    });
  });
});
