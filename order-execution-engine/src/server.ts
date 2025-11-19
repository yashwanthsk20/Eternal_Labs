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

    fastify.get('/health', async () => ({
      status: 'ok',
      timestamp: Date.now(),
      database: 'mongodb'
    }));

    const port = parseInt(process.env.PORT || '3000');
    await fastify.listen({ port, host: '0.0.0.0' });
    
    console.log(`
    🚀 Server running on http://localhost:${port}
    🍃 Database: MongoDB
    📡 WebSocket: ws://localhost:${port}/api/orders/:orderId/status
    🏥 Health: http://localhost:${port}/health
    `);

  } catch (error) {
    fastify.log.error(error);
    await closeDatabase();
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await fastify.close();
  await closeDatabase();
  process.exit(0);
});

start();