import { Queue, Worker } from 'bullmq';
import { OrderProcessor } from '../services/order-processor.service';
import dotenv from 'dotenv';

dotenv.config();

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_HOST?.includes('upstash.io') ? {} : undefined,
};

export const orderQueue = new Queue('order-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
  },
});

const processor = new OrderProcessor();

export const orderWorker = new Worker(
  'order-processing',
  async (job) => {
    console.log(`🚀 [Worker] Processing job ${job.id} for order ${job.data.orderId}`);
    await processor.processOrder(job);
  },
  {
    connection: redisConnection,
    concurrency: 10,
    limiter: {
      max: 100,
      duration: 60000,
    },
  }
);

orderWorker.on('completed', (job) => {
  console.log(`✅ [Worker] Job ${job.id} completed`);
});

orderWorker.on('failed', (job, err) => {
  console.log(`❌ [Worker] Job ${job?.id} failed:`, err.message);
});