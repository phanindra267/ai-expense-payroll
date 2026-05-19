# AI-Smart Expense & Payroll Management System

> Enterprise-grade fintech SaaS platform with AI-powered expense categorisation, anomaly detection, real-time dashboards, and offline-first architecture.

![Node.js](https://img.shields.io/badge/Node.js-20-green) ![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue) ![React](https://img.shields.io/badge/React-18-61DAFB) ![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248) ![Redis](https://img.shields.io/badge/Redis-7-DC382D) ![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)

---

## 🏗️ Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   React SPA  │────▶│  Express API │────▶│   MongoDB    │
│  (Vite/RTK)  │◀────│  (TypeScript)│◀────│   (Mongoose) │
│  Socket.io   │     │  Socket.io   │     └──────────────┘
│  IndexedDB   │     │  BullMQ      │     ┌──────────────┐
└──────────────┘     │  LangChain   │────▶│    Redis     │
                     │  OpenTelemetry│     │   (BullMQ)   │
                     └──────────────┘     └──────────────┘
                            │
                     ┌──────────────┐
                     │    Ollama    │
                     │  (Llama 3)  │
                     └──────────────┘
```

## ✨ Features

- **Multi-tenant** organisation & user management with enterprise JWT auth
- **AI-powered** expense categorisation & anomaly detection (LangChain + Ollama)
- **Real-time** dashboards with Socket.io and offline-first IndexedDB sync
- **Payroll processing** with worker threads for parallel computation
- **Budget monitoring** with real-time alerts (Slack + Email)
- **Semantic search** across expenses (ChromaDB or MongoDB text fallback)
- **PDF salary slips** generation
- **CSV reports** export
- **Full observability** (Winston, OpenTelemetry, Prometheus)
- **Idempotency** for safe retries across all write operations
- **Queue resilience** with BullMQ dead-letter queues and duplicate prevention

---

## 🚀 Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js 20+](https://nodejs.org/) (for local development)
- [Git](https://git-scm.com/)

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone <your-repo-url>
cd ai-expense-payroll

# Copy environment file
cp .env.example .env

# Start all services
docker-compose up --build

# Pull the AI model (first time only, in a separate terminal)
docker-compose exec ollama ollama pull llama3
```

The app will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Health**: http://localhost:3000/health
- **Prometheus Metrics**: http://localhost:3000/metrics

### Option 2: Local Development

```bash
# Run the setup script
chmod +x scripts/setup.sh
./scripts/setup.sh

# Start backend (terminal 1)
cd backend
npm run dev

# Start frontend (terminal 2)
cd frontend
npm run dev
```

### Option 3: Manual Setup

```bash
# 1. Start infrastructure
docker-compose up -d mongodb redis ollama

# 2. Pull AI model
docker-compose exec ollama ollama pull llama3

# 3. Install & run backend
cd backend
cp .env.example .env
npm ci
npm run migrate
npm run dev

# 4. Install & run frontend (new terminal)
cd frontend
npm ci
npm run dev
```

---

## 🧪 Running Tests

```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm test -- --testPathPattern=auth
```

---

## 📊 API Documentation

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register organisation + admin user |
| POST | `/api/auth/login` | Login, returns JWT tokens |
| POST | `/api/auth/refresh` | Rotate refresh token |
| POST | `/api/auth/logout` | Revoke current refresh token |
| POST | `/api/auth/logout-all` | Revoke all refresh tokens |
| POST | `/api/auth/forgot-password` | Send password reset email |
| POST | `/api/auth/reset-password` | Reset password with token |

### Employees

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees` | List employees |
| POST | `/api/employees` | Create employee |
| GET | `/api/employees/:id` | Get employee |
| PUT | `/api/employees/:id` | Update employee |
| DELETE | `/api/employees/:id` | Delete employee |
| POST | `/api/employees/:id/adjustments` | Add monthly adjustments |

### Expenses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/expenses` | List expenses (with filters) |
| POST | `/api/expenses` | Create expense |
| GET | `/api/expenses/:id` | Get expense |
| PUT | `/api/expenses/:id` | Update expense |
| DELETE | `/api/expenses/:id` | Delete expense |
| GET | `/api/expenses/search` | Semantic search |

### Payroll

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payroll/process` | Process payroll for month |
| GET | `/api/payroll/history` | Get payroll history |
| GET | `/api/payroll/:id/slip` | Download salary slip PDF |
| PATCH | `/api/payroll/:id/status` | Update payroll status |

### Budget

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/budgets` | List budgets |
| POST | `/api/budgets` | Set budget |
| PUT | `/api/budgets/:id` | Update budget |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | Dashboard summary cards |
| GET | `/api/dashboard/trends` | Expense trends (6 months) |
| GET | `/api/dashboard/categories` | Category breakdown |
| GET | `/api/dashboard/alerts` | Active alerts |

### AI

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/chat` | Chat with AI agent |
| GET | `/api/ai/roles` | List available AI roles |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/expenses/csv` | Export expenses as CSV |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check (DB, Redis, Ollama, workers) |
| GET | `/metrics` | Prometheus metrics |

---

## 🔐 Security Features

- **JWT** access tokens (15min) + refresh tokens (7d, HTTP-only cookies)
- **Token rotation** with reuse detection (revoke all on reuse)
- **bcrypt** password hashing (12 salt rounds)
- **Rate limiting** (100 req/min per IP)
- **Helmet** security headers
- **CORS** restricted to frontend URL
- **Input validation** with express-validator
- **AI safety filters** (prompt injection prevention, tool rate limiting)
- **Multi-tenant isolation** across all data access

---

## 📡 Real-time Events (Socket.io)

| Event | Direction | Description |
|-------|-----------|-------------|
| `expense:added` | Server → Client | New expense created |
| `budget:alert` | Server → Client | Budget threshold crossed |
| `payroll:processed` | Server → Client | Payroll processing complete |
| `anomaly:detected` | Server → Client | Expense anomaly flagged |
| `sync-state` | Client → Server | Request missed events |

---

## 🌐 Free Tier Deployment

| Service | Provider | Free Tier |
|---------|----------|-----------|
| MongoDB | [MongoDB Atlas](https://www.mongodb.com/atlas) | 512MB free cluster |
| Redis | [Upstash](https://upstash.com/) | 10K commands/day |
| Backend | [Render](https://render.com/) | 750 hours/month |
| Frontend | [Vercel](https://vercel.com/) | Unlimited |
| Email | [Gmail SMTP](https://support.google.com/a/answer/176600) | Free with App Password |
| Slack | [Slack Webhooks](https://api.slack.com/messaging/webhooks) | Free |

---

## 📁 Project Structure

```
ai-expense-payroll/
├── .github/workflows/ci.yml          # CI/CD pipeline
├── scripts/setup.sh                   # Local setup script
├── backend/
│   ├── src/
│   │   ├── models/                    # Mongoose models (9 models)
│   │   ├── controllers/               # Route handlers (8 controllers)
│   │   ├── services/
│   │   │   ├── ai/                    # LangChain + Ollama integration
│   │   │   ├── queue/                 # BullMQ queues (3 queues)
│   │   │   ├── payroll.service.ts     # Payroll calculation engine
│   │   │   ├── notification.service.ts # Slack + Email
│   │   │   ├── websocket.service.ts   # Socket.io server
│   │   │   ├── idempotency.service.ts # Idempotency logic
│   │   │   └── telemetry.service.ts   # OpenTelemetry setup
│   │   ├── middleware/                # Auth, RBAC, rate limit, etc.
│   │   ├── utils/                     # Logger, metrics, anonymise
│   │   ├── workers/                   # BullMQ workers (3 workers)
│   │   ├── routes/                    # Express route definitions
│   │   ├── migrations/                # Database migrations
│   │   ├── tests/                     # Jest + Supertest tests
│   │   ├── app.ts                     # Express app setup
│   │   └── server.ts                  # HTTP server + Socket.io
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── features/                  # Feature-based modules
│   │   ├── app/                       # Store, socket, offline storage
│   │   ├── components/                # Shared UI components
│   │   ├── hooks/                     # Custom React hooks
│   │   ├── pages/                     # Page components
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 📝 License

MIT License. You have full rights to use, modify, and commercialise this project.
