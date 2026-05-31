import { httpRequestDuration, httpRequestsTotal } from "../config/metrics.js";

//This middleware will be used in app.js to track all incoming HTTP requests
export function metricsMiddleware(req, res, next) {
    const start = Date.now();

 // Normalize the route path for metrics.
  // WHY normalize?
  // Without normalization:
  //   /api/v1/profile/clx123  ← different metric for every user ID
  //   /api/v1/profile/clx456
  //   /api/v1/profile/clx789
  //   → thousands of different metric labels → Prometheus explodes
  //
  // With normalization:
  //   /api/v1/profile/:id  ← one metric for all profile requests
  //   → clean, manageable metrics
  res.on('finish', () => {
    const duration = (Date.now() - start ) / 1000;

    const route = req.route?.path ? `${req.method} ${req.route.path}`: req.path;

    const labels = {
        method: req.method,
        route: route,
        status_code: req.statusCode,
    };

    //Increment request counter
    httpRequestsTotal.inc(labels);

    httpRequestDuration.observe(labels, duration);
  });
  next();

}