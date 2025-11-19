import { WebSocket } from '@fastify/websocket'; // Fixed: import WebSocket instead of SocketStream
import { StatusUpdate } from '../types/order.types';

export class WebSocketService {
  private static clients = new Map<string, Set<WebSocket>>();

  static registerClient(orderId: string, socket: WebSocket): void {
    if (!this.clients.has(orderId)) {
      this.clients.set(orderId, new Set());
    }
    this.clients.get(orderId)!.add(socket);
    console.log(`📡 [WebSocket] Client connected for order ${orderId}`);
    
    this.sendToSocket(socket, {
      status: 'connected',
      message: 'WebSocket connection established',
      timestamp: Date.now(),
    });
  }

  static unregisterClient(orderId: string, socket: WebSocket): void {
    const clients = this.clients.get(orderId);
    if (clients) {
      clients.delete(socket);
      if (clients.size === 0) {
        this.clients.delete(orderId);
      }
      console.log(`📡 [WebSocket] Client disconnected from order ${orderId}`);
    }
  }

  static sendUpdate(orderId: string, data: StatusUpdate): void {
    const clients = this.clients.get(orderId);
    if (clients) {
      clients.forEach(socket => {
        this.sendToSocket(socket, data);
      });
    }
  }

  private static sendToSocket(socket: WebSocket, data: any): void {
    try {
      socket.send(JSON.stringify(data));
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
    }
  }
}