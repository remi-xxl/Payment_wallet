import { Worker } from "bullmq";
import { createRedisConnection } from "../config/redis.js";
import {
  sendTransactionReceipt,
  sendMonthlyStatement,
} from "../utils/mailer.js";
import logger from "../config/logger.js";

// WHAT IS HAPPENING HERE?
// A Worker connects to Redis and listens to a specific queue.
// When a job arrives in the queue, BullMQ calls our "processor" function
// automatically with the job data.
// We never call the processor manually — BullMQ does it for us.

// The processor function receives the job and decides what to do
// based on the job NAME.
// Think of it like a switchboard:
//   job.name = "transaction-receipt" → send receipt emails
//   job.name = "monthly-statement"   → send statement email
async function processEmailJob(job) {
 logger.info('processing email job', { jobName: job.name, jobId: job.id})
  switch (job.name) {
    case "transaction-receipt": {
      await sendTransactionReceipt(job.data);
      logger.info(`[EmailWorker] Receipt sent for transaction: ${job.data.transactionId}`, { jobId: job.id });
      break;
    }

    case "monthly-statement": {
      await sendMonthlyStatement(job.data);
      logger.info(`[EmailWorker] Statement sent to: ${job.data.userEmail}`, { jobId: job.id });
      break;
    }

    default: {
      throw new Error(`[EmailWorker] Unknown job name: ${job.name}`);
    }
  }
}

export const emailWorker = new Worker("email", processEmailJob, {
  connection: createRedisConnection(),
  concurrency: 5,
});



//---WORKER EVENT LISTENER----

emailWorker.on('completed', (job) => {
    logger.info(`[EmailWorker] Job completed: ${job.name} (ID:${job.id})`)
});

emailWorker.on('failed', (job,err) => {
    logger.error(`[EmailWorker] Job failed: ${job.name}(ID: ${job.id})`);
    logger.error(`[EmailWorker] Error: ${err.message}`)
})

emailWorker.on('error' ,(err) => {
logger.error('Email worker error', {error: err.message} )
});

logger.info('✅ Email worker started and listening for jobs');