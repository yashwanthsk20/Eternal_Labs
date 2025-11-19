# 🚀 Order Execution Engine with DEX Routing

A high-performance order execution engine that intelligently routes trades across Raydium and Meteora DEXs, providing real-time WebSocket status updates throughout the order lifecycle.

[![Live Demo](https://img.shields.io/badge/Live-Demo-success)](https://eternal-labs.onrender.com)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)](https://www.mongodb.com/)

## 🌐 Live Deployment

**Production URL:** https://eternal-labs.onrender.com

**Quick Test:**
```bash
# Health Check
curl https://eternal-labs.onrender.com/health

# Create Order
curl -X POST https://eternal-labs.onrender.com/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{"tokenIn":"SOL","tokenOut":"USDC","amount":100}'
```

---

## 📋 Table of Contents

- [Overview](#overview)
- [Why Market Orders?](#why-market-orders)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [API Documentation](#api-documentation)
- [WebSocket Integration](#websocket-integration)
- [Local Setup](#local-setup)
- [Demo Video](#demo-video)

---

## 🎯 Overview

This order execution engine processes **Market Orders** with intelligent DEX routing across Raydium and Meteora protocols. The system automatically compares prices from both DEXs and routes orders to the venue offering the best execution price.

### Key Capabilities:
- ✅ **Concurrent Processing**: Handles 10 simultaneous orders with 100 orders/minute throughput
- ✅ **Smart Routing**: Automatic best-price selection between Raydium and Meteora
- ✅ **Real-time Updates**: WebSocket streaming of order status (pending → routing → confirmed)
- ✅ **Retry Logic**: Exponential backoff with up to 3 retry attempts
- ✅ **Order History**: Persistent storage of all executed orders

---

## 💡 Why Market Orders?

**Chosen Order Type:** Market Order

**Reasoning:** Market orders provide immediate execution at the current market price, making them ideal for demonstrating DEX routing logic without the added complexity of price monitoring (required for limit orders) or event listening for token launches (required for sniper orders).

### Extension Path for Other Order Types:

**Limit Orders:** Add a `PriceMonitor` service that polls DEX prices every 5 seconds. When the target price is reached, the system automatically triggers order execution through the existing routing engine.

**Sniper Orders:** Implement a `TokenLaunchWatcher` service that subscribes to Raydium and Meteora pool creation events via Solana WebSocket connections. Upon detecting a new token launch, immediately execute the swap through the routing engine.

---

## 🏗️ Architecture

### System Design
```
┌─────────────────┐
│   Client API    │
│   (REST/WS)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│  Fastify Server │─────▶│   BullMQ     │
│  + WebSocket    │      │   Queue      │
└────────┬────────┘      └──────┬───────┘
         │                      │
         │                      ▼
         │              ┌──────────────┐
         │              │    Order     │
         │              │  Processor   │
         │              └──────┬───────┘
         │                     │
         ▼                     ▼
┌─────────────────┐    ┌──────────────┐
│    MongoDB      │    │  DEX Router  │
│  (Order Store)  │    │  (Raydium +  │
│                 │    │   Meteora)   │
└─────────────────┘    └──────────────┘
```

### Order Lifecycle Flow
```
1. POST /api/orders/execute
   └─> Validate input
   └─> Generate orderId
   └─> Save to MongoDB (status: pending)
   └─> Add to BullMQ queue
   └─> Return orderId

2. WebSocket Connection
   └─> Client connects to /api/orders/{orderId}/status
   └─> Receives real-time updates

3. Order Processing (via BullMQ Worker)
   └─> Status: PENDING (Order received)
   └─> Status: ROUTING (Query Raydium + Meteora)
   └─> Compare prices → Select best DEX
   └─> Status: BUILDING (Create transaction)
   └─> Status: SUBMITTED (Send to network)
   └─> Status: CONFIRMED (Success) + txHash
```

---

## ✨ Features

### 1. **DEX Routing Engine**
- Queries both Raydium and Meteora simultaneously
- Compares output amounts after fees
- Automatically selects the DEX with better execution price
- Logs routing decisions for transparency

### 2. **WebSocket Status Streaming**
Real-time order status updates:
```json
{
  "status": "routing",
  "message": "Comparing DEX prices",
  "timestamp": 1234567890,
  "metadata": {
    "selectedDex": "Meteora",
    "estimatedOutput": 99.8,
    "fee": 0.002
  }
}
```

### 3. **Concurrent Order Processing**
- **10 concurrent workers** processing orders simultaneously
- **Rate limiting:** 100 orders per minute
- **Queue management:** BullMQ with Redis backend

### 4. **Error Handling & Retry Logic**
- **Exponential backoff:** 1s → 2s → 4s delays
- **Max retries:** 3 attempts
- **Failure persistence:** Error messages stored in MongoDB
- **Status tracking:** Failed orders marked with reason

### 5. **Order History**
- All orders persisted in MongoDB
- Indexed by status and creation time
- Queryable via REST API

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js 18+ | Server-side JavaScript execution |
| **Language** | TypeScript | Type-safe development |
| **Web Framework** | Fastify 4 | High-performance HTTP + WebSocket server |
| **Message Queue** | BullMQ + Redis | Job processing and concurrency control |
| **Database** | MongoDB Atlas | Order persistence and history |
| **Cache** | Redis (Upstash) | Queue state management |
| **Deployment** | Render.com | Cloud hosting with auto-deploy |

---

## 📡 API Documentation

### Base URL
- **Production:** `https://eternal-labs.onrender.com`
- **Local:** `http://localhost:3000`

### Endpoints

#### 1. Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1234567890,
  "database": "mongodb"
}
```

---

#### 2. Create Order
```http
POST /api/orders/execute
Content-Type: application/json

{
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amount": 100
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "order_1234567890_abc123",
  "websocketUrl": "/api/orders/order_1234567890_abc123/status",
  "message": "Order created and queued for execution"
}
```

---

#### 3. Get Order Status (HTTP)
```http
GET /api/orders/{orderId}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "orderId": "order_1234567890_abc123",
    "tokenIn": "SOL",
    "tokenOut": "USDC",
    "amount": 100,
    "status": "confirmed",
    "dex": "Meteora",
    "txHash": "0x1a2b3c4d...",
    "executedPrice": 0.998,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:05Z"
  }
}
```

---

#### 4. List All Orders
```http
GET /api/orders
```

**Response:**
```json
{
  "success": true,
  "orders": [...],
  "count": 50
}
```

---

## 🔌 WebSocket Integration

### Connection
```javascript
const orderId = 'order_1234567890_abc123';
const ws = new WebSocket(`wss://eternal-labs.onrender.com/api/orders/${orderId}/status`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(`Status: ${data.status} - ${data.message}`);
};
```

### Status Updates Sequence
```json
// 1. Connected
{"status":"connected","message":"WebSocket connection established"}

// 2. Pending
{"status":"pending","message":"Order received and queued"}

// 3. Routing
{"status":"routing","message":"Comparing DEX prices"}

// 4. Building
{
  "status":"building",
  "message":"Building transaction on Meteora",
  "metadata": {
    "selectedDex":"Meteora",
    "estimatedOutput":99.8,
    "fee":0.002
  }
}

// 5. Submitted
{"status":"submitted","message":"Transaction sent to network"}

// 6. Confirmed
{
  "status":"confirmed",
  "message":"Transaction successful",
  "metadata": {
    "txHash":"0x1a2b3c4d...",
    "executedPrice":0.998,
    "dex":"Meteora"
  }
}
```

---

## 💻 Local Setup

### Prerequisites
- Node.js 18+ 
- MongoDB Atlas account (or local MongoDB)
- Redis (Upstash or local)

### Installation

1. **Clone Repository**
```bash
git clone <your-repo-url>
cd order-execution-engine
```

2. **Install Dependencies**
```bash
npm install
```

3. **Configure Environment**
Create `.env` file:
```env
PORT=3000
NODE_ENV=development

# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/orders_db

# Redis (Upstash)
REDIS_HOST=your-redis-host.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

4. **Start Server**
```bash
npm run dev
```

Server runs at `http://localhost:3000`

---

## 🎥 Demo Video

**YouTube Link:** [Add your video link here]

### Demo Content:
1. **Architecture Overview** (20s) - Explain folder structure and design decisions
2. **Live API Testing** (40s) - Submit 5 concurrent orders via Postman
3. **WebSocket Real-time Updates** (40s) - Display status progression
4. **DEX Routing Logs** (20s) - Show console logs with price comparison
5. **Database Verification** (20s) - Query MongoDB to show stored orders

**Total Duration:** ~2 minutes

---

## 📊 Key Design Decisions

### 1. **Mock vs Real Implementation**
- **Choice:** Mock Implementation
- **Reason:** Focus on system architecture and routing logic without blockchain complexity
- **Advantage:** Faster development, easier testing, no devnet dependencies

### 2. **MongoDB vs PostgreSQL**
- **Choice:** MongoDB Atlas
- **Reason:** Flexible schema for order metadata, JSON-native, faster setup

### 3. **BullMQ vs Other Queues**
- **Choice:** BullMQ with Redis
- **Reason:** Built-in concurrency control, retry logic, rate limiting

### 4. **Fastify vs Express**
- **Choice:** Fastify
- **Reason:** 76% faster, native WebSocket support, schema validation

---

## 📁 Project Structure
```
order-execution-engine/
├── src/
│   ├── config/
│   │   └── database.ts              # MongoDB connection
│   ├── models/
│   │   └── order.model.ts           # Order schema
│   ├── services/
│   │   ├── dex-router.service.ts    # DEX routing logic
│   │   ├── order-processor.service.ts # Order execution
│   │   └── websocket.service.ts     # WebSocket manager
│   ├── queue/
│   │   └── order.queue.ts           # BullMQ configuration
│   ├── routes/
│   │   └── orders.route.ts          # API endpoints
│   ├── types/
│   │   └── order.types.ts           # TypeScript types
│   └── server.ts                    # Main entry point
├── .env                             # Environment variables
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
└── README.md                        # This file
```

---

## 🙏 Acknowledgments

- Fastify team for excellent WebSocket support
- BullMQ for robust queue management
- MongoDB Atlas for free cloud database
- Upstash for Redis hosting
- Render.com for free deployment

---

**Built with ❤️ for efficient DEX order routing**