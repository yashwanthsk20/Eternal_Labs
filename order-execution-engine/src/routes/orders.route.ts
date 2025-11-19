import { FastifyInstance, FastifyRequest } from 'fastify';
import { orderQueue } from '../queue/order.queue';
import { WebSocketService } from '../services/websocket.service';
import { getOrdersCollection } from '../config/database';
import { Order, OrderStatus } from '../types/order.types';

interface OrderBody {
  tokenIn: string;
  tokenOut: string;
  amount: number;
}

interface OrderParams {
  orderId: string;
}

export async function orderRoutes(fastify: FastifyInstance) {
  const ordersCollection = getOrdersCollection();

  fastify.post('/api/orders/execute', async (request: FastifyRequest<{ Body: OrderBody }>, reply) => {
    const { tokenIn, tokenOut, amount } = request.body;
    
    if (!tokenIn || !tokenOut || !amount || amount <= 0) {
      return reply.code(400).send({
        error: 'Invalid request',
        message: 'tokenIn, tokenOut, and positive amount are required',
      });
    }
    
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    try {
      const order: Order = {
        orderId,
        tokenIn,
        tokenOut,
        amount,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await ordersCollection.insertOne(order);
      await orderQueue.add('process-order', { orderId, tokenIn, tokenOut, amount });
      
      console.log(`📝 [API] Order created: ${orderId}`);
      
      return reply.code(201).send({
        success: true,
        orderId,
        websocketUrl: `/api/orders/${orderId}/status`,
        message: 'Order created and queued for execution',
      });
      
    } catch (error: any) {
      console.error('Error creating order:', error);
      return reply.code(500).send({ error: 'Internal server error', message: error.message });
    }
  });

  fastify.get('/api/orders/:orderId/status', { websocket: true }, (socket, req) => {
    const { orderId } = req.params as OrderParams;
    WebSocketService.registerClient(orderId, socket);
    
    socket.on('close', () => WebSocketService.unregisterClient(orderId, socket));
    socket.on('error', (err: Error) => {
      console.error(`WebSocket error for order ${orderId}:`, err);
      WebSocketService.unregisterClient(orderId, socket);
    });
  });

  fastify.get('/api/orders/:orderId', async (request: FastifyRequest<{ Params: OrderParams }>, reply) => {
    const { orderId } = request.params;
    
    try {
      const order = await ordersCollection.findOne({ orderId });
      if (!order) {
        return reply.code(404).send({ error: 'Not found', message: 'Order not found' });
      }
      return reply.send({ success: true, order });
    } catch (error: any) {
      return reply.code(500).send({ error: 'Internal server error', message: error.message });
    }
  });

  fastify.get('/api/orders', async (request, reply) => {
    try {
      const orders = await ordersCollection.find({}).sort({ createdAt: -1 }).limit(50).toArray();
      return reply.send({ success: true, orders, count: orders.length });
    } catch (error: any) {
      return reply.code(500).send({ error: 'Internal server error', message: error.message });
    }
  });
}