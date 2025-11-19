export interface Order {
  orderId: string;
  tokenIn: string;
  tokenOut: string;
  amount: number;
  status: OrderStatus;
  dex?: string;
  txHash?: string;
  executedPrice?: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum OrderStatus {
  PENDING = 'pending',
  ROUTING = 'routing',
  BUILDING = 'building',
  SUBMITTED = 'submitted',
  CONFIRMED = 'confirmed',
  FAILED = 'failed'
}

export interface DexQuote {
  dex: string;
  price: number;
  fee: number;
  outputAmount: number;
}

export interface ExecutionResult {
  txHash: string;
  executedPrice: number;
  status: string;
}

export interface StatusUpdate {
  status: OrderStatus;
  message: string;
  timestamp: number;
  metadata?: any;
}
