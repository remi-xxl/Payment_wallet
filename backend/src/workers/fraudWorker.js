import { Worker } from "bullmq";
import { createRedisConnection } from "../config/redis.js";
import prisma from '../utils/prisma.js';
import { runFraudChecks } from "../utils/fraudRules.js";


async function processFraudJob(job) {
  console.log(`[FraudWorker] Processing job: ${job.name} (ID: ${job.id})`);

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
        console.log(`[FraudWorker] ✅ Transaction ${transactionId} is clean`);
        break;
      }

      // STEP 3: Fraud detected — log all alerts
      console.warn(`[FraudWorker] 🚨 ${alerts.length} alert(s) for transaction ${transactionId}`);
      alerts.forEach((alert) => {
        console.warn(`  → [${alert.severity}] ${alert.rule}: ${alert.reason}`);
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
        console.warn(`[FraudWorker]  HIGH severity — account should be frozen`);
        console.warn(`[FraudWorker] Compliance team should be notified`);
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
  console.log(`[FraudWorker] ✅ Job completed: ${job.name} (ID: ${job.id})`);
});

fraudWorker.on('failed', (job, err) => {
  console.error(`[FraudWorker] ❌ Job failed: ${job.name} (ID: ${job.id})`);
  console.error(`[FraudWorker] Error: ${err.message}`);
});

fraudWorker.on('error', (err) => {
  console.error('[FraudWorker] Worker error:', err.message);
});

console.log('✅ Fraud worker started and listening for jobs');