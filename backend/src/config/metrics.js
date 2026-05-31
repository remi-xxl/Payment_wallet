import client, { Gauge } from 'prom-client';

//it holds all the metrics 
const register = new client.Registry();

//Collect default metrics and prefix them with 'fintech_'
client.collectDefaultMetrics({
    register,
    prefix: 'fintech_',
});


// --HTTP REQUEST DURATION METRIC--
//counter to track total HTTP requests
//A counter only goes UP
//Use for : total requests, total errors, total references
export const httpRequestsTotal = new client.Counter({
    name: 'fintech_http_requests_total',
    help: 'Total number of HTTP requests',


    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
});

//Histogram: measures distribution of values
//use for: request duration, response size
//A histogram tracks:
// How many requests completed in < 10ms etc
export const httpRequestDuration = new client.Histogram({
    name:'fintech_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],

    buckets: [0.01,0.05, 0.1, 0.5, 1, 2, 5 ],
    registers: [register],
}) 

// --BUSINESS METRICS--

export const transferTotal = new client.Counter({
    name: 'fintech_transfers_total',
    help: 'Total number of successful money transfers',
    registers: [register],
});

export const transferValueTotal = new client.Counter({
    name: 'fintech_transfer_value_kobo_total',
    help: 'Total value of transfers in kobo',
    registers: [register],
})


export const transferFailureTotal = new client.Counter({
    name: 'fintech_transfers_failures_total',
    help: 'Total number of failed money transfers',
    labelNames: ['reason'],
    registers:[register]
});

export const registrationsTotal = new client.Counter({
    name:'fintech_fraud_registrations_total',
    help: 'Total number of user registrations',
    labelNames: ['method', 'route'],
    registers: [register]
});

export const fraudAlertsTotal = new client.Counter({
    name: 'fintech_fraud_alerts_total',
    help: 'Total number of fraud alerts detected', 
    labelNames: ['rule', 'severity'],
    registers: [register],
});

//Gauge: tracks current value of something that can go up and down
//Use for: active users, current balance, open support tickets
export const activeUsersGauge = new client.Gauge({
    name: 'fintech_active_users',
    help: 'Current number of active users',
    registers: [register],
});

export const queueSize = new client.Gauge({
    name: 'fintech_fraud_queue_size',
    help: 'Number of jobs in each queue',
    labelNames: ['queue'],
    registers: [register],
});

export const dbConnectionsPool = new client.Gauge({
    name:'fintech_db_connections_pool',
    help: 'Number of active database connections in the pool',
    labelNames: ['state'],
    registers: [register],
});


export { register};



