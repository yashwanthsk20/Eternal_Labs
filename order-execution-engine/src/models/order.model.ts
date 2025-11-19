import { ObjectId } from 'mongodb';

export interface OrderDocument {
  _id?: ObjectId;
  orderId: string;
  tokenIn: string;
  tokenOut: string;
  amount: number;
  status: string;
  dex?: string;
  txHash?: string;
  executedPrice?: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}