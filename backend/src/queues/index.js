import { Queue} from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import logger from '../config/logger.js';


// WHY WE CREATE QUEUES HERE IN ONE PLACE:
// A Queue object is what the REST of your app interacts with.
// Your transfer service does not need to know about Redis or BullMQ internals.
// It just imports the queue and calls queue.add() — that is it.
// Keeping all queue creation in one file means:
//   → One place to see all queues in the system
//   → Easy to add new queues later
//   → No duplicate queue instances

// ─── EMAIL QUEUE ─────────────────────────────────────────────
// This queue holds jobs related to sending emails.
// Jobs added to this queue:
//   → transaction-receipt: sends receipt to sender and receiver
//   → monthly-statement:   sends monthly account statement
export const emailQueue = new Queue('email', {

  // Every queue needs its own Redis connection
  connection: createRedisConnection(),

  // defaultJobOptions apply to EVERY job added to this queue
  // unless the job overrides them
  defaultJobOptions: {

    // How many times to retry a failed job before giving up
    // Email sending can fail due to network issues — retry 3 times
    attempts: 3,

    backoff: {
      // "exponential" means wait longer between each retry:
      //   Retry 1: wait 1 second
      //   Retry 2: wait 2 seconds
      //   Retry 3: wait 4 seconds
      // This prevents hammering a failing email server
      type:  'exponential',
      delay: 1000, // starting delay in milliseconds
    },

    // Remove completed jobs from Redis after 24 hours
    // WHY? Completed jobs take up Redis memory.
    // We keep them for 24 hours for debugging purposes.
    // After that they are automatically cleaned up.
    removeOnComplete: {
      age: 24 * 60 * 60, // 24 hours in seconds
    },

    // Keep failed jobs for 7 days so we can investigate
    removeOnFail: {
      age: 7 * 24 * 60 * 60, // 7 days in seconds
    },
  },
});

// ─── FRAUD QUEUE ─────────────────────────────────────────────
// This queue holds jobs for fraud detection checks.
// Every transfer adds a job here to be analysed.
export const fraudQueue = new Queue('fraud', {
  connection: createRedisConnection(),

  defaultJobOptions: {
    attempts: 2,

    backoff: {
      type:  'exponential',
      delay: 500,
    },

    removeOnComplete: {
      age: 24 * 60 * 60,
    },

    removeOnFail: {
      age: 7 * 24 * 60 * 60,
    },
  },
});

// Log when queues are ready
emailQueue.on('error', (err) => {
  logger.error('[EmailQueue] Error:', { error: err.message });
});

fraudQueue.on('error', (err) => {
  logger.error('[FraudQueue] Error:', { error: err.message });
});

logger.info('✅ Queues initialized');


// // TEMPORARY — delete after confirming it works
// emailQueue.add('test-job', { message: 'Hello from queue' })
//   .then((job) => console.log(`✅ Test job added with ID: ${job.id}`))
//   .catch((err) => console.error('❌ Queue connection failed:', err.message));