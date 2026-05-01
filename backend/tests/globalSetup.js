// tests/globalSetup.js
import prisma from '../src/utils/prisma.js';

export async function setup() {
  // Clean up database before all tests run
  await cleanup();
}

export async function teardown() {
  // Clean up database after all tests complete
  await cleanup();
  await prisma.$disconnect();
}

async function cleanup() {
  try {
    await prisma.transaction.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.wallet.deleteMany();
    await prisma.user.deleteMany();
  } catch (error) {
    // Ignore errors during cleanup
  }
}
