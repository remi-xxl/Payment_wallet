// src/modules/health/metrics.routes.js
import { Router }   from 'express';
import { register } from '../../config/metrics.js';

const router = Router();

// GET /metrics
// Prometheus scrapes this endpoint every 15 seconds.
// The response is in Prometheus text format — not JSON.
// It looks like:
//   # HELP fintech_http_requests_total Total number of HTTP requests
//   # TYPE fintech_http_requests_total counter
//   fintech_http_requests_total{method="GET",route="/api/v1/wallet/me",status_code="200"} 42
router.get('/', async (req, res) => {

  // Set the content type Prometheus expects
  res.set('Content-Type', register.contentType);

  // Generate and send all metrics
  const metrics = await register.metrics();
  res.end(metrics);
});

export default router;