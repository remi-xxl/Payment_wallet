import * as healthService from './health.service.js';
import logger from '../../config/logger.js';
import asyncHandler from '../../utils/asynchandler.js';
import { getDatabaseStats } from './database.monitor.js';



export const liveness = asyncHandler(async (req, res) => {
  const status = await healthService.getRedinessStatus();

  res.status(200).json({
    success: true,
    data:    status,
  });
});


export const readiness = asyncHandler(async (req, res) => {
  const status = await healthService.getRedinessStatus();

  // 200 if ready, 503 if not ready
  // 503 = Service Unavailable
  const httpStatus = status.status === 'ready' ? 200 : 503;

  if (httpStatus === 503) {
    logger.warn('Readiness check failed', { checks: status.checks });
  }

  res.status(httpStatus).json({
    success: status.status === 'ready',
    data:    status,
  });
});


export const databaseStats = asyncHandler(async (req,res) => {
    const stats = await getDatabaseStats();

    res.status(200).json({
        success: true,
        data: stats
    })
})