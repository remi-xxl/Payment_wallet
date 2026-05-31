import logger from '../config/logger.js';


// Circuit breaker states
const State = {
  CLOSED:    'CLOSED',    // normal — requests flow through
  OPEN:      'OPEN',      // broken — requests blocked immediately
  HALF_OPEN: 'HALF_OPEN', // testing — one request allowed through
};

export class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;

    // How many failures before opening the circuit
    this.failureThreshold = options.failureThreshold || 5;

    // How long to wait before testing recovery (ms)
    this.recoveryTimeout  = options.recoveryTimeout  || 30000; // 30 seconds

    // How long a request can take before counting as failure (ms)
    this.requestTimeout   = options.requestTimeout   || 5000;  // 5 seconds

    // Internal state
    this.state          = State.CLOSED;
    this.failureCount   = 0;
    this.lastFailureTime = null;
    this.successCount   = 0;
  }

  // Execute a function through the circuit breaker
  async execute(fn) {

    // ── OPEN STATE ─────────────────────────────────────────
    if (this.state === State.OPEN) {

      // Check if recovery timeout has passed
      const timeSinceFailure = Date.now() - this.lastFailureTime;

      if (timeSinceFailure < this.recoveryTimeout) {
        // Still in recovery — block the request immediately
        logger.warn('Circuit breaker OPEN — request blocked', {
          breaker:           this.name,
          remainingCooldown: `${this.recoveryTimeout - timeSinceFailure}ms`,
        });

        // Throw immediately — no waiting
        throw new Error(`Service ${this.name} is temporarily unavailable`);
      }

      // Recovery timeout passed — move to half-open to test
      logger.info('Circuit breaker moving to HALF-OPEN', {
        breaker: this.name,
      });

      this.state = State.HALF_OPEN;
    }

    // ── CLOSED or HALF-OPEN STATE ──────────────────────────
    try {
      // Create a timeout promise that rejects after requestTimeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Request timeout after ${this.requestTimeout}ms`)),
          this.requestTimeout
        )
      );

      // Race between the actual function and the timeout
      // Whichever resolves/rejects first wins
      const result = await Promise.race([fn(), timeoutPromise]);

      // Request succeeded
      this.onSuccess();
      return result;

    } catch (error) {
      // Request failed
      this.onFailure(error);
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;

    if (this.state === State.HALF_OPEN) {
      // Recovery test passed — back to normal
      logger.info('Circuit breaker CLOSED — service recovered', {
        breaker: this.name,
      });
      this.state = State.CLOSED;
    }
  }

  onFailure(error) {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    logger.warn('Circuit breaker recorded failure', {
      breaker:      this.name,
      failureCount: this.failureCount,
      threshold:    this.failureThreshold,
      error:        error.message,
    });

    if (
      this.state === State.HALF_OPEN ||
      this.failureCount >= this.failureThreshold
    ) {
      // Too many failures — open the circuit
      logger.error('Circuit breaker OPENED — blocking requests', {
        breaker:      this.name,
        failureCount: this.failureCount,
      });

      this.state          = State.OPEN;
      this.failureCount   = 0;
    }
  }

  // Returns current circuit breaker status
  getStatus() {
    return {
      name:            this.name,
      state:           this.state,
      failureCount:    this.failureCount,
      failureThreshold: this.failureThreshold,
      lastFailureTime:  this.lastFailureTime,
    };
  }
}

// Create circuit breakers for each external dependency
// These are singletons — one per dependency
export const databaseCircuitBreaker = new CircuitBreaker('database', {
  failureThreshold: 5,
  recoveryTimeout:  30000, // 30 seconds
  requestTimeout:   5000,  // 5 seconds
});

export const redisCircuitBreaker = new CircuitBreaker('redis', {
  failureThreshold: 3,
  recoveryTimeout:  15000, // 15 seconds
  requestTimeout:   2000,  // 2 seconds
});