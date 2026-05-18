// // tests/setup.js
// import { execSync } from 'child_process';
// import prismaTest from '../src/utils/prismaTestClient.js';


// beforeAll(async () => {
//   // Push schema to the test database
//   execSync('npx prisma db push', {
//     env: {
//       ...process.env,
//       DATABASE_URL: process.env.TEST_DATABASE_URL,
//     },
//     stdio: 'inherit',
//   });
// });

// afterAll(async () => {
//   await prismaTest.$disconnect();
// });
// tests/setup.js
import { execSync } from 'child_process';

beforeAll(async () => {
  console.log('Test database:', process.env.DATABASE_URL);
  // Push schema to test database
  execSync('npx prisma db push --accept-data-loss', {
    env: {
      ...process.env,
    },
    stdio: 'inherit',
  });
});
