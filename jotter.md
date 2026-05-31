# Jotter — Fintech API Reference

## Project Structure

```
.
├── backend/                  # Express API server
│   ├── prisma/               # Schema + migrations
│   ├── docker/               # Nginx config + monitoring configs
│   ├── src/
│   │   ├── config/           # env, session, redis, logger, security, cookies, metrics
│   │   ├── middlewares/      # auth, error, rate-limit, idempotency, request-logger, timeout, metrics, validate
│   │   ├── modules/          # feature modules: auth, wallet, transaction, profile, health
│   │   ├── queues/           # BullMQ queue definitions (email, fraud)
│   │   ├── workers/          # BullMQ workers (process queue jobs)
│   │   ├── routes/           # API version router
│   │   ├── utils/            # prisma, jwt, cache, mailer, nuban, ApiError, circuitBreaker, queryAnalyzer
│   │   ├── jobs/             # Scheduled job definitions
│   │   ├── app.js            # Express app setup
│   │   └── server.js         # Entry point + graceful shutdown
│   ├── tests/                # Vitest test files
│   ├── .env                  # Docker/production env vars
│   ├── .env.dev              # Local dev env vars (auto-loaded)
│   ├── Dockerfile
│   └── docker-compose.yml
├── frontend/                 # React + Vite + Tailwind SPA
│   ├── src/App.jsx           # Main app (login, dashboard, transfer)
│   ├── vite.config.js        # Dev proxy to backend on :5555
│   ├── Dockerfile            # Multi-stage: Vite build → nginx serve
│   └── docker/nginx/         # nginx config (SPA + API proxy)
├── render.yaml               # Render blueprint (backend + frontend)
├── .github/workflows/ci.yml  # GitHub Actions CI
└── jotter.md                 # This file
```

---

## Backend Dependencies

| Package | Version | Purpose |
|---|---|---|
| `express` | ^5.2.1 | HTTP framework |
| `@prisma/client` | ^7.7.0 | Database ORM |
| `@prisma/adapter-pg` | ^7.7.0 | Prisma PostgreSQL adapter |
| `prisma` (dev) | ^7.7.0 | Prisma CLI (migrations, generate, studio) |
| `bcryptjs` | ^3.0.3 | Password hashing |
| `jsonwebtoken` | ^9.0.3 | JWT signing & verification |
| `bullmq` | ^5.76.5 | Redis-backed job queues |
| `ioredis` | ^5.10.1 | Redis client |
| `express-session` | ^1.19.0 | Session middleware |
| `connect-pg-simple` | ^10.0.0 | PostgreSQL session store |
| `cookie-parser` | ^1.4.7 | Parse cookies from request headers |
| `express-rate-limit` | ^8.3.2 | Rate limiting |
| `helmet` | ^8.1.0 | Security headers |
| `cors` | ^2.8.6 | CORS handling |
| `compression` | ^1.8.1 | Gzip response compression |
| `zod` | ^4.3.6 | Request validation |
| `winston` | ^3.19.0 | Logging |
| `winston-daily-rotate-file` | ^5.0.0 | Log rotation (production) |
| `nodemailer` | ^8.0.7 | Email sending |
| `dotenv` | ^16.4.5 | Environment variable loading |
| `prom-client` | ^15.1.3 | Prometheus metrics |
| `uuid` | ^14.0.0 | Unique ID generation |
| `nodemon` (dev) | ^3.1.14 | Dev auto-restart |
| `vitest` (dev) | ^4.1.5 | Test runner |
| `supertest` (dev) | ^7.2.2 | HTTP assertion testing |

## Frontend Dependencies

| Package | Purpose |
|---|---|
| `react` ^19.2.6 | UI library |
| `react-dom` ^19.2.6 | React DOM renderer |
| `vite` ^8.0.12 | Build tool + dev server |
| `@vitejs/plugin-react` | React fast-refresh for Vite |
| `tailwindcss` ^4.3.0 | Utility-first CSS |
| `@tailwindcss/vite` | Tailwind Vite plugin |

---

## Environment Variables

### Local dev (`.env.dev`)
Loaded automatically when `NODE_ENV !== 'production'`:

```env
NODE_PORT=5555
DATABASE_URL=postgresql://fintech_app:aderemi325@localhost:5432/fintech_db
JWT_ACCESS_SECRET=your-access-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret
REDIS_HOST=localhost
REDIS_PORT=6380
EMAIL_HOST=smtp.ethereal.email
EMAIL_PORT=587
EMAIL_USER=your-ethereal-user
EMAIL_PASS=your-ethereal-pass
EMAIL_FROM=noreply@fintechapi.com
```

### Docker (`.env` or Docker Compose env vars)
Same keys but with Docker hostnames (`postgres`, `redis` instead of `localhost`).

---

## How Each Feature Works

### 1. Authentication (JWT + Refresh Tokens + Session)

**Architecture:**
- Access token (15 min) — short-lived, sent in `Authorization: Bearer <token>` header
- Refresh token (7 days) — long-lived, stored as httpOnly cookie + hashed in DB
- Session (7 days) — stored in PostgreSQL via `connect-pg-simple`, used for server-side state

**Login flow:**
1. `POST /api/v1/auth/login` — validates email + password with bcrypt
2. Generates access token (`jwt.sign`) and refresh token
3. Sets refresh token as `httpOnly`, `sameSite: strict` cookie
4. Saves hashed refresh token in `RefreshToken` table
5. Creates session row in PostgreSQL `session` table
6. Returns `{ user, accessToken }` to client

**Register flow:**
1. `POST /api/v1/auth/register` — checks for duplicate email
2. Hashes password with bcrypt (12 rounds)
3. Creates user + wallet inside a Prisma `$transaction`
   - Wallet gets auto-incremented `serialNumber`
   - Account number generated from serial using NUBAN algorithm
4. Returns same token pair as login

**Token refresh (`POST /api/v1/auth/refresh`):**
- Reads `refreshToken` from httpOnly cookie
- Verifies JWT signature
- Checks token exists in DB, not revoked, not expired
- **Rotation**: revokes old token + issues new pair
- If attacker steals a refresh token, the real user's next request invalidates it

**Logout:**
- Revokes refresh token in DB
- Clears cookie
- Destroys PostgreSQL session

**Auth middleware** (`src/middlewares/auth.middleware.js`):
- Extracts `Bearer` token from `Authorization` header
- Verifies JWT → sets `req.user = { userId, email }`
- Throws 401 if missing, expired, or invalid

### 2. Session (PostgreSQL via connect-pg-simple)

**Purpose:** Server-side session storage (separate from JWT). Used for server-side state that shouldn't travel with the client.

**Setup** (`src/config/session.js`):
- Store: PostgreSQL (`connect-pg-simple`)
- Table: `session` (auto-created)
- TTL: 7 days
- Cookie: `httpOnly`, `sameSite: strict`

**Why both JWT and sessions?**
- JWT: stateless auth for API requests (no DB lookup per request)
- Session: stores ephemeral server state like MFA challenges, OAuth state

### 3. Background Jobs (BullMQ + Redis)

**Architecture:** Producer-consumer pattern via Redis

```
API Request → Queue.add(job) → Redis → Worker processes job
```

**Two queues** (`src/queues/index.js`):

| Queue | Purpose | Retries | Backoff |
|---|---|---|---|
| `email` | Send transaction receipts, statements | 3 | Exponential (1s) |
| `fraud` | Check transactions for suspicious patterns | 2 | Exponential (500ms) |

**Workers** (`src/workers/`):
- `emailWorker.js`: Listens to `email` queue. Processes:
  - `transaction-receipt` — sends receipt to both sender and receiver
  - `monthly-statement` — sends monthly statement to user
- `fraudWorker.js`: Listens to `fraud` queue. Processes:
  - `check-transaction` — runs fraud detection rules

**Key points:**
- Workers run in the same Node process as the API server (for simplicity)
- Event listeners log completion/failure/errors
- Failed jobs stay in queue for retry (up to max attempts)
- Completed jobs auto-remove after 24h, failed after 7 days

### 4. Redis

**Used for:**

| Feature | Keys Pattern | TTL |
|---|---|---|
| Wallet cache | `wallet:<userId>` | 60s |
| Profile cache | `profile: <userId>` | 300s |
| Transaction history cache | `transactions:<userId>:<page>:<limit>` | 30s |
| Idempotency keys | `idempotency <userId>:<key>` | 24h |
| BullMQ job queues | (managed by BullMQ) | — |

**Cache-aside pattern** (`src/utils/cache.js:withCache`):
```
1. Check Redis for key
2. If found → return cached data
3. If not found → fetch from DB → store in Redis → return data
```

**Cache invalidation:** After a transfer, sender's wallet cache, receiver's wallet cache, and sender's transaction history cache are all deleted so next request fetches fresh data.

### 5. Docker Setup

**Services:**

| Service | Container | Port (host) | Purpose |
|---|---|---|---|
| `frontend` | fintech-frontend | 80 | nginx serving React SPA + proxying API |
| `app` | fintech-app | — | Express API (internal port 5555) |
| `postgres` | fintech-postgres | 5434 | PostgreSQL database |
| `redis` | fintech-redis-compose | 6380 | Redis (caching + queues) |
| `pgbouncer` | fintech-pgbouncer | 5433 | Connection pooling for Postgres |
| `prometheus` | fintech-prometheus | 9090 | Metrics collection |
| `grafana` | fintech-grafana | 3001 | Metrics visualization |

**Networking:** All services on `fintech-network` bridge. Services communicate by container name (`postgres:5432`, `redis:6379`, `app:5555`).

**Startup order:** `postgres` + `redis` (with healthchecks) → `app` → `frontend`

**App startup command:**
```bash
npx prisma db push --accept-data-loss && node src/server.js
```

### 6. PostgreSQL / Prisma

**Schema** (`prisma/schema.prisma`):

| Table | Key Fields |
|---|---|
| `users` | id, email (unique), password (hashed), firstName, lastName |
| `wallets` | id, balance (Decimal 19,4), serialNumber, accountNumber (unique), userId (unique FK) |
| `transaction` | id, amount (Decimal 19,4), type (TRANSFER/DEPOSIT/WITHDRAWAL), status (PENDING/SUCCESS/FAILED), senderWalletId, receiverWalletId |
| `RefreshToken` | id, token (hashed, unique), expiresAt, revoked, userId |
| `fraud_alerts` | id, transactionId, walletId, rule, reason, severity (LOW/MEDIUM/HIGH), reviewed |

**Auto-generated account numbers:** Uses NUBAN algorithm (Nigeria standardized):
- Wallet gets auto-increment `serialNumber`
- `generateNUBAN(serialNumber)` → 10-digit account number

### 7. Transfer Flow (The Most Complex Part)

**Endpoint:** `POST /api/v1/transactions/transfer`

**Flow:**

1. **Authenticate** — JWT middleware verifies token
2. **Rate limit** — `transferLimiter`: 10 requests per minute
3. **Validate** — Zod schema checks body:
   - Either `recipientEmail` or `accountNumber` (not both, not neither)
   - `amount`: positive, max 2 decimal places
4. **Idempotency check** — If `X-Idempotency-Key` header is present:
   - Check Redis for previous response
   - If found → return cached response (prevents duplicate transfers)
5. **Transaction** (Prisma `$transaction` with `FOR UPDATE` lock):
   - **STEP 1**: `SELECT ... FROM wallets WHERE userId = ? FOR UPDATE` (row-level lock on sender's wallet)
   - **STEP 2**: Check sender has sufficient balance
   - **STEP 3**: Find recipient by email or account number (reject self-transfer)
   - **STEP 4**: `UPDATE wallets SET balance = balance - amount WHERE id = ?` (sender deduction — happens in DB, not JS)
   - **STEP 5**: `UPDATE wallets SET balance = balance + amount WHERE id = ?` (recipient addition — happens in DB)
   - **STEP 6**: Create `transaction` record with type=TRANSFER, status=SUCCESS
   - **If any step fails**: entire transaction rolls back (no partial updates)
6. **Post-transaction** (outside the DB transaction):
   - Delete sender's wallet cache
   - Delete receiver's wallet cache
   - Delete sender's transaction history cache
   - Queue email job (send receipt to both parties)
   - Queue fraud check job

**Why `FOR UPDATE`?** Prevents race conditions. Without it, two simultaneous transfers could both read the same balance and overspend.

**Why DB-level math?** `SET balance = balance - amount` executes inside PostgreSQL, not JavaScript. No risk of stale JS values.

### 8. Wallet Caching

**Read path:**
```
GET /api/v1/wallet/me
  → walletService.getMyWallet(userId)
    → withCache("wallet:<userId>", 60, fetchFn)
      → Redis.get("wallet:<userId>")
        → HIT: return cached JSON
        → MISS: Prisma query → Redis.set(..., 60) → return data
```

**Cache busting:** Transfer service calls `deleteCache()` for both sender and receiver wallets, so next read hits the database.

### 9. Rate Limiting

Three limiters (`src/config/security.js`):

| Limiter | Window | Max | Applied To |
|---|---|---|---|
| `generalLimiter` | 15 min | 100 | All API routes |
| `authLimiter` | 15 min | 10 | Auth routes (login/register) |
| `transferLimiter` | 1 min | 10 | Transfer route |

Nginx also has rate limiting via `limit_req` zones. The Express `generalLimiter` is the primary limiter (nginx is a secondary layer).

### 10. Security

- **Helmet**: Sets security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- **CORS**: Whitelisted origins (localhost:3000, 5173, 5500)
- **httpOnly cookies**: Refresh token is inaccessible to JavaScript
- **SameSite: strict**: Cookies not sent on cross-site requests
- **Password hashing**: bcrypt with 12 salt rounds
- **Refresh token rotation**: Old token revoked when new one is issued
- **Session**: httpOnly cookie, stored in PostgreSQL (not Redis, so session survives Redis restart)
- **Trust proxy**: Express trust proxy = 1 (trust nginx reverse proxy)
- **Request timeout**: 30s middleware kills hanging requests

### 11. Logging (Winston + DailyRotateFile)

**Format:**
- Development: colored, human-readable with timestamp
- Production: JSON format (parsable by log aggregators)

**Transports:**
- Console (both dev and prod)
- File (production only):
  - `logs/error-YYYY-MM-DD.log` — errors only, 30 days retention, 20MB max
  - `logs/combined-YYYY-MM-DD.log` — all levels, 14 days retention, 20MB max

**Request logging middleware** (`src/middlewares/requestLogger.middleware.js`):
- Logs every incoming request with UUID, method, URL, IP, user agent
- Logs completed request with status code, duration
- Warns on requests slower than 1 second

### 12. API Versioning

- All routes under `/api/v1/`
- Version info at `GET /api/v1` (lists all endpoints)
- Each version is a separate Express Router in `src/routes/v1/`

### 13. Monitoring (Prometheus + Grafana)

**Custom metrics** (`src/config/metrics.js`):
- `registrationsTotal`: Counter — tracks user registrations
- `transferTotal`: Counter — tracks transfers
- `transferValueTotal`: Counter — tracks total value transferred (in kobo)
- `transferFailureTotal`: Counter — tracks transfer failures by reason

**Endpoints:**
- `GET /metrics` — Prometheus scrape endpoint
- `GET /health/live` — liveness check (always 200)
- `GET /health/ready` — readiness check (checks memory, DB)
- `GET /health/database` — detailed DB stats (authenticated)

### 14. Error Handling

**Custom error class** (`src/utils/ApiError.js`):
- Extends Error with `statusCode`
- Used for all controlled error cases

**Error handler middleware** (`src/middlewares/error.middleware.js`):
1. Logs error with full context (requestId, method, path, userId, stack)
2. If `ApiError` → returns `{ success: false, message }` with correct status
3. If Prisma `P2002` (unique constraint) → 409
4. Everything else → 500 "An interval server error occurred"
5. Development mode includes `stack` in 500 responses

### 15. Idempotency

**Purpose:** Prevent duplicate transfers when client retries the same request.

**How it works** (`src/middlewares/idempotency.middleware.js`):
1. Client sends `X-Idempotency-Key` header (10-100 chars)
2. Middleware checks Redis for `idempotency <userId>:<key>`
3. If found → return cached response (status code + body)
4. If not found → monkey-patch `res.json()`:
   - After successful response (2xx), store response in Redis for 24 hours
   - Subsequent identical requests get the cached response

### 16. Zod Validation

**Pattern:** Middleware pattern in `src/middlewares/validate.js`:
```js
router.post('/transfer', validate(transferSchema), controller.transfer)
```

**Transfer schema** (`src/modules/transaction/transaction.schema.js`):
- `recipientEmail`: optional, valid email, lowercased
- `accountNumber`: optional, exactly 10 digits, valid NUBAN checksum
- Must provide exactly one of the two
- `amount`: positive number, max 2 decimal places
- `description`: optional, max 100 chars

### 17. Frontend Architecture

**React + Vite + Tailwind v4:**
- Single-page app with login/register/dashboard views
- No external UI library (pure Tailwind)
- API calls via relative `/api/v1/...` paths
- Vite dev proxy: `/api/*` → `localhost:5555`
- Production: nginx serves static build + proxies API

**Frontend Dockerfile:**
```
Stage 1 (build): node:20-alpine → npm ci → vite build
Stage 2 (serve): nginx:alpine → copy dist/ → serve with API proxy config
```

**Nginx config** (`frontend/docker/nginx/default.conf`):
- Serves React SPA at `/` (with fallback to `index.html` for client-side routing)
- Proxies `/api/`, `/health/`, `/metrics/` to backend `app:5555`

---

## Common Commands

```bash
# Local development (requires Redis on port 6380)
cd backend && npm run dev

# Frontend development
cd frontend && npm run dev

# Docker (full stack)
cd backend && docker compose up -d --build

# Prisma Studio (against Docker DB)
DATABASE_URL="postgresql://postgres:admin@localhost:5434/fintech_db" npx prisma studio

# Clear Redis cache
docker exec fintech-redis-compose redis-cli FLUSHALL

# Rebuild single service
docker compose build app && docker compose up -d app

# Run tests
cd backend && npm test

# Check logs
docker logs fintech-app --tail 50

# Connect to Docker PostgreSQL
docker exec -it fintech-postgres psql -U postgres -d fintech_db
```

---

## Known Quirks & Notes

- `transferFailureTotal` counter is incremented on every transfer (not just failures) — intentional for tracking total attempts
- Wallet cache TTL is 60 seconds; after manual DB edits via Prisma Studio, wait 60s or flush Redis
- `/health/ready` may report "not ready" if heap usage exceeds 90% — benign in low-memory environments
- Session table is recreated on each `prisma db push` (session data lost on schema sync)
- Ethereal email is a fake SMTP server; emails are viewable at https://ethereal.email
- PostgreSQL user `fintech_app` needs explicit `CREATE` + schema permissions for Prisma to work
