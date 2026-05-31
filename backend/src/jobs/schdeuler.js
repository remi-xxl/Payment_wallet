// src/jobs/scheduler.js
import { Queue } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import logger from '../config/logger.js';

const schedulerQueue = new Queue('scheduler', {
  connection: createRedisConnection(),
});

export async function setupScheduledJobs() {

  // Monthly account statement — 1st of every month at 8am
  await schedulerQueue.add(
    'monthly-statement',
    {},
    {
      repeat: {
        // Cron expression: minute hour day month weekday
        // "0 8 1 * *" = at 8:00am on the 1st of every month
        pattern: '0 8 1 * *',
      },
    }
  );

  // Daily database backup — every day at 2am
  await schedulerQueue.add(
    'database-backup',
    {},
    {
      repeat: {
        // "0 2 * * *" = at 2:00am every day
        pattern: '0 2 * * *',
      },
    }
  );

  logger.info('Scheduled jobs initialized', {
    jobs: ['monthly-statement', 'database-backup'],
  });
}