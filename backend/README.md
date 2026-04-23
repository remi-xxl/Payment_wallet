# Fintech API

A production-ready REST API simulating core payment feature. Built with Node.js, Express, PostgreSQL, and Prisma.

## Features

- JWT authentication with access and refresh tokens
- HttpOnly cookie storage for refresh tokens
- Session management with PostgreSQL session store
- Wallet management with precise Decimal balance tracking
- ACID-compliant money transfers using database transactions
- Row-level locking to prevent race conditions
- Transaction history with pagination
- Wallet funding (deposit simulation)
- Password change with full session revocation
- Rate limiting on sensitive routes
- Helmet security headers
- CORS protection
- Global error handling

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js + Express | HTTP server and routing |
| PostgreSQL | Primary database |
| Prisma ORM | Database queries and migrations |
| JWT | Stateless authentication |
| bcryptjs | Password hashing |
| Zod | Request validation |
| express-session | Session management |
| Helmet + CORS | Security headers |
| express-rate-limit | Brute force protection |


## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Installation

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```

Then fill in your values in `.env`

4. Run database migrations
```bash
npx prisma migrate dev
```

5. Start the development server
```bash
npm run dev
```

Server runs at `http://localhost:3000`

## API Endpoints

### Auth
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | /api/auth/register | Create account | No |
| POST | /api/auth/login | Login | No |
| POST | /api/auth/logout | Logout | No |
| POST | /api/auth/refresh | Refresh access token | No |

### Profile
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | /api/profile/me | Get my profile | Yes |
| PATCH | /api/profile/change-password | Change password | Yes |

### Wallet
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | /api/wallet/me | Get wallet balance | Yes |
| POST | /api/wallet/fund | Fund wallet | Yes |

### Transactions
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | /api/transactions/transfer | Transfer money | Yes |
| GET | /api/transactions/history | Get history | Yes |

## Key Concepts Implemented

### ACID Transactions
All money movements use Prisma transactions to guarantee atomicity.
If any step fails, all database changes are rolled back.

### Row Level Locking
Wallet rows are locked with SELECT FOR UPDATE during transfers
to prevent race conditions when concurrent requests hit the same wallet.

### Token Rotation
Refresh tokens are rotated on every use. Old tokens are immediately
revoked so stolen tokens can only be used once.

### Security Layers
- Passwords hashed with bcrypt (12 rounds)
- Refresh tokens stored as SHA-256 hashes in the database
- HttpOnly cookies prevent JavaScript from accessing refresh tokens
- Rate limiting on auth and transfer routes
- Helmet sets secure HTTP response headers

## Environment Variables

```bash
PORT=3000
DATABASE_URL=....
JWT_ACCESS_SECRET=your_access_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
SESSION_SECRET=your_session_secret
```

## License
MIT