import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import dotenv from 'dotenv';
import { orderRoutes } from './routes/orders.route';
import { connectDatabase, closeDatabase } from './config/database';

dotenv.config();

const fastify = Fastify({
  logger: { level: 'info' },
});

async function start() {
  try {
    await connectDatabase();
    await fastify.register(websocket);
    await fastify.register(orderRoutes);

    // Root endpoint - API documentation
    fastify.get('/', async () => ({
      name: 'Eternal Labs Order Execution Engine',
      version: '1.0.0',
      status: 'running',
      timestamp: Date.now(),
      endpoints: {
        health: 'GET /health',
        createOrder: 'POST /api/orders/execute',
        getAllOrders: 'GET /api/orders',
        getOrder: 'GET /api/orders/:orderId',
        websocket: 'WS /api/orders/:orderId/status'
      },
      documentation: {
        createOrder: {
          method: 'POST',
          url: '/api/orders/execute',
          description: 'Create and execute a new DEX order',
          body: {
            tokenIn: 'string (e.g., "ETH")',
            tokenOut: 'string (e.g., "USDC")',
            amount: 'number (e.g., 1.5)'
          },
          example: {
            tokenIn: 'ETH',
            tokenOut: 'USDC',
            amount: 1.5
          }
        },
        getAllOrders: {
          method: 'GET',
          url: '/api/orders',
          description: 'Get all orders (last 50, sorted by creation date)'
        },
        getOrder: {
          method: 'GET',
          url: '/api/orders/:orderId',
          description: 'Get details of a specific order'
        },
        websocket: {
          protocol: 'WebSocket',
          url: 'ws://your-domain/api/orders/:orderId/status',
          description: 'Real-time order status updates'
        }
      }
    }));

    // Health check endpoint
    fastify.get('/health', async () => ({
      status: 'ok',
      timestamp: Date.now(),
      database: 'mongodb',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }));

    const port = parseInt(process.env.PORT || '3000');
    await fastify.listen({ port, host: '0.0.0.0' });
    
    console.log(`
    🚀 Server running on http://localhost:${port}
    🍃 Database: MongoDB
    📡 WebSocket: ws://localhost:${port}/api/orders/:orderId/status
    🏥 Health: http://localhost:${port}/health
    📚 API Docs: http://localhost:${port}/
    `);

  } catch (error) {
    fastify.log.error(error);
    await closeDatabase();
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing gracefully...');
  await fastify.close();
  await closeDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing gracefully...');
  await fastify.close();
  await closeDatabase();
  process.exit(0);
});

start();