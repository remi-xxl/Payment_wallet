import app from './app.js';
import { env } from './config/env.js';
import logger from './config/logger.js';
import prisma from './utils/prisma.js';
import { emailWorker } from './workers/emailWorker.js';
import { fraudWorker } from './workers/fraudWorker.js';




const server = app.listen(env.port, () => {

    logger.info(`Server is running on http://localhost:${env.port}`)
});

//Gracful shutdown
async function gracefulShutdown(signal) {
logger.info(`${signal} received --- starting graceful shutdown`)

//Step 1 : Stop accepting new http requests
 server.close(async () => {
    logger.info(`HTTP server closed - no new requesta accepeted`);

    try {
        //step 2: Close background workers
        await Promise.all([
            emailWorker.close(),
            fraudWorker.close()
        ]);
        logger.info('Workers Closed')
       //step 3: Disconnect Prisma from postgres
        await prisma.$disconnect();
        logger.info('Prisma disconnected ')

        //step 4: Exit successfully
        logger.info('Graceful shutdown completed successfully')
        process.exit(0);
    } catch (error) {
        logger.error('Error occurred while shutting down', { error });

        process.exit(1);
    }
 });

 setTimeout(() => {
    logger.error('Shutdown timeout -- forcing exit');
    process.exit(1);
 }, 30000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));


process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack,
    });
     // Uncaught exceptions leave the app in an unknown state
  // Safest thing is to exit and let the process manager restart
    process.exit(1)
})

process.on('unhandledRejection', (reason) => {
    logger.error('unhandled Regection', {
        reason: reason?.message || reason,
    });

    process.exit(1)
});

