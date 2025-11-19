import { MongoClient, Db, Collection } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let client: MongoClient;
let db: Db;

export async function connectDatabase(): Promise<Db> {
  try {
    // Hardcoded connection string (temporary fix)
    const uri = 'mongodb+srv://yashy7432_db_user:Yashwanth%40123@cluster0.r3jnvbv.mongodb.net/';
    
    console.log('🔄 Connecting to MongoDB Atlas...');
    
    client = new MongoClient(uri);
    await client.connect();
    
    db = client.db('orders_db');
    
    // Create indexes for performance
    await db.collection('orders').createIndex({ status: 1 });
    await db.collection('orders').createIndex({ createdAt: -1 });
    await db.collection('orders').createIndex({ orderId: 1 }, { unique: true });
    
    console.log('✅ MongoDB connected successfully');
    return db;
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database not initialized. Call connectDatabase() first');
  }
  return db;
}

export function getOrdersCollection(): Collection {
  return getDatabase().collection('orders');
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

process.on('SIGINT', async () => {
  await closeDatabase();
  process.exit(0);
});
