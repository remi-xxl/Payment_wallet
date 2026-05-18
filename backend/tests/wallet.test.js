// tests/wallet.test.js
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
async function registerUser(email = undefined, firstName = 'John', lastName = 'Doe') {
  if (!email) email = getUniqueEmail('wallet');
  
  const response = await request
    .post('/api/v1/auth/register')
    .send({
      email,
      password:  'password123',
      firstName,
      lastName,
    });

  if (!response.body.success || !response.body.data?.accessToken) {
    throw new Error(`Registration failed for ${email}: ${JSON.stringify(response.body)}`);
  }

  return { accessToken: response.body.data.accessToken, email };
}

describe('Wallet Endpoints', () => {

  describe('GET /api/v1/wallet/me', () => {

    it('should not return wallet without a token', async () => {
      const response = await request.get('/api/v1/wallet/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return wallet balance for authenticated user', async () => {
      const user = await registerUser(getUniqueEmail('wallet-test'), 'Wallet', 'Test');

      const response = await request
        .get('/api/v1/wallet/me')
        .set('Authorization', `Bearer ${user.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wallet).toBeDefined();
      expect(response.body.data.wallet.balance).toBeDefined();
    });
  });
});
