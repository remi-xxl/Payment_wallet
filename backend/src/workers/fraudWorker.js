import { Worker } from "bullmq";

import { createRedisConnection } from "../config/redis.js";
import prisma from '../utils/prisma.js';
import { runFraudChecks } from "../utils/fraudRules.js";
import logger from "../config/logger.js";
import { fraudAlertsTotal } from "../config/metrics.js";
// Prometheus Counter for fraud alerts



async function processFraudJob(job) {
  logger.info('Processing fraud job', { jobId: job.id, jobName: job.name });

  const { transactionId, walletId, amount } = job.data;

  switch (job.name) {

    case 'check-transaction': {

      // STEP 1: Run all fraud rules against this transaction
      const alerts = await runFraudChecks({
        walletId,
        transactionId,
        amount,
      });

      // STEP 2: If no alerts — transaction is clean
      if (alerts.length === 0) {
        logger.info('Processing fraud job', { jobId: job.id});
        break;
      }

      // STEP 3: Fraud detected — log all alerts
      logger.warn('Fraud detected', { jobId: job.id, transactionId, alertCount: alerts.length });
      alerts.forEach((alert) => {
        logger.warn(`  → [${alert.severity}] ${alert.rule}: ${alert.reason}`);
        fraudAlertsTotal.inc({
          rule: alert.rule,
          severity: alert.severity,
        });
      });

      // STEP 4: Save all fraud alerts to the database
      // createMany inserts multiple rows in one database call
      // Much faster than calling create() in a loop
      await prisma.fraudAlert.createMany({
        data: alerts.map((alert) => ({
          transactionId,
          walletId,
          rule:     alert.rule,
          reason:   alert.reason,
          severity: alert.severity,
        })),
      });
      

      // STEP 5: Flag the transaction in the database
      // We record which rule triggered first as the main reason
      const highestAlert = alerts.find((a) => a.severity === 'HIGH')
        || alerts.find((a) => a.severity === 'MEDIUM')
        || alerts[0];

      await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          flagged:    true,
          flagReason: highestAlert.reason,
        },
      });

      // STEP 6: In production you would also:
      //   → Send an alert email to the compliance team
      //   → Freeze the user's account if severity is HIGH
      //   → Send a security notification to the user
      //   → Create a support ticket for manual review
      // We log these as reminders
      if (highestAlert.severity === 'HIGH') {
        logger.warn('HIGH severity — account should be frozen', { jobId: job.id, transactionId });
        logger.warn('Compliance team should be notified', { jobId: job.id, transactionId });
      }

      break;
    }

    default: {
      throw new Error(`[FraudWorker] Unknown job name: ${job.name}`);
    }
  }
}

// Create the fraud worker
export const fraudWorker = new Worker(
  'fraud',
  processFraudJob,
  {
    connection: createRedisConnection(),

    // Only process one fraud check at a time.
    // WHY? Fraud checks query the database heavily.
    // Running many simultaneously could slow down the database
    // and affect the main API performance.
    concurrency: 2,
  }
);

// Event listeners
fraudWorker.on('completed', (job) => {
  logger.info('Job completed', { jobId: job.id, jobName: job.name });
});

fraudWorker.on('failed', (job, err) => {
  logger.error('Job failed', { jobId: job.id, jobName: job.name, error: err.message });
});

fraudWorker.on('error', (err) => {
  logger.error('Worker error:', { error: err.message });
});

logger.info('✅ Fraud worker started and listening for jobs');