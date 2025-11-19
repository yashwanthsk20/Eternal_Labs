import { Job } from 'bullmq';
import { DexRouter } from './dex-router.service';
import { WebSocketService } from './websocket.service';
import { getOrdersCollection } from '../config/database';
import { OrderStatus, StatusUpdate } from '../types/order.types';
import { Collection } from 'mongodb';

export class OrderProcessor {
  private dexRouter = new DexRouter();
  private maxRetries = 3;
  private ordersCollection: Collection | null = null;

  // Lazy load collection
  private getCollection(): Collection {
    if (!this.ordersCollection) {
      this.ordersCollection = getOrdersCollection();
    }
    return this.ordersCollection;
  }

  async processOrder(job: Job): Promise<void> {
    const { orderId, tokenIn, tokenOut, amount } = job.data;
    
    try {
      // 1. PENDING
      await this.updateStatus(orderId, OrderStatus.PENDING, 'Order received and queued');
      await this.sleep(500);

      // 2. ROUTING
      await this.updateStatus(orderId, OrderStatus.ROUTING, 'Comparing DEX prices');
      const bestQuote = await this.dexRouter.getBestQuote(tokenIn, tokenOut, amount);
      
      // 3. BUILDING
      await this.updateStatus(orderId, OrderStatus.BUILDING, `Building transaction on ${bestQuote.dex}`, {
        selectedDex: bestQuote.dex,
        estimatedOutput: bestQuote.outputAmount,
        fee: bestQuote.fee,
      });
      await this.sleep(1000);

      // 4. SUBMITTED
      await this.updateStatus(orderId, OrderStatus.SUBMITTED, 'Transaction sent to network');
      
      // 5. EXECUTE (with retry logic)
      const result = await this.executeWithRetry(bestQuote.dex, bestQuote, orderId);
      
      // 6. CONFIRMED
      await this.updateStatus(orderId, OrderStatus.CONFIRMED, 'Transaction successful', {
        txHash: result.txHash,
        executedPrice: result.executedPrice,
        dex: bestQuote.dex,
        outputAmount: bestQuote.outputAmount,
      });
      
      // Update MongoDB
      await this.getCollection().updateOne(
        { orderId },
        {
          $set: {
            status: OrderStatus.CONFIRMED,
            dex: bestQuote.dex,
            txHash: result.txHash,
            executedPrice: result.executedPrice,
            updatedAt: new Date(),
          }
        }
      );

    } catch (error: any) {
      console.error(`❌ [Order ${orderId}] Failed:`, error.message);
      await this.updateStatus(orderId, OrderStatus.FAILED, error.message);
      
      await this.getCollection().updateOne(
        { orderId },
        {
          $set: {
            status: OrderStatus.FAILED,
            errorMessage: error.message,
            updatedAt: new Date(),
          }
        }
      );
      
      throw error;
    }
  }

  private async executeWithRetry(dex: string, quote: any, orderId: string, attempt = 1): Promise<any> {
    try {
      return await this.dexRouter.executeSwap(dex, quote);
    } catch (error: any) {
      if (attempt >= this.maxRetries) {
        throw new Error(`Failed after ${this.maxRetries} attempts: ${error.message}`);
      }
      
      const backoffMs = Math.pow(2, attempt) * 1000;
      console.log(`🔄 [Retry] Attempt ${attempt}/${this.maxRetries} failed for order ${orderId}, retrying in ${backoffMs}ms`);
      
      await this.updateStatus(orderId, OrderStatus.SUBMITTED, `Retry attempt ${attempt}/${this.maxRetries} after failure`, {
        attempt,
        nextRetryIn: backoffMs,
      });
      
      await this.sleep(backoffMs);
      return this.executeWithRetry(dex, quote, orderId, attempt + 1);
    }
  }

  private async updateStatus(orderId: string, status: OrderStatus, message: string, metadata?: any): Promise<void> {
    const update: StatusUpdate = {
      status,
      message,
      timestamp: Date.now(),
      metadata,
    };
    
    WebSocketService.sendUpdate(orderId, update);
    console.log(`📊 [Order ${orderId}] ${status}: ${message}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}