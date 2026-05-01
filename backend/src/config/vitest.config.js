import { defineConfig} from 'vitest/config';
import dotenv from 'dotenv';

// Load .env file manually here so we can read TEST_DATABASE_URL
dotenv.config();

export default defineConfig({
  test: {
    // "node" environment means tests run in Node.js
    sequence: {
      concurrent: false,
    },
    environment: 'node',

    setupFiles: ['../../tests/setup.js'],
    globalSetup: ['../../tests/globalSetup.js'],

    // Run test files one at a time, not in parallel.
    // WHY? Our tests share a database. If two tests run
    // at the same time they could interfere with each other —
    // e.g. one test deletes a user another test is using.

    env: {
      DATABASE_URL: process.env.DATABASE_URL ,
      NODE_ENV:      'test',
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },

    // How long a single test can run before it is considered failed.
    // Database operations can be slow so we give 10 seconds.
    testTimeout: 10000,
  },
  
});