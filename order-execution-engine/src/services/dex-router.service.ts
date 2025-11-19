import { DexQuote, ExecutionResult } from '../types/order.types';

export class DexRouter {
  async getRaydiumQuote(tokenIn: string, tokenOut: string, amount: number): Promise<DexQuote> {
    await this.sleep(200);
    
    const basePrice = 1.0;
    const price = basePrice * (0.98 + Math.random() * 0.04);
    const fee = 0.003;
    
    return {
      dex: 'Raydium',
      price,
      fee,
      outputAmount: amount * price * (1 - fee),
    };
  }

  async getMeteorQuote(tokenIn: string, tokenOut: string, amount: number): Promise<DexQuote> {
    await this.sleep(200);
    
    const basePrice = 1.0;
    const price = basePrice * (0.97 + Math.random() * 0.05);
    const fee = 0.002;
    
    return {
      dex: 'Meteora',
      price,
      fee,
      outputAmount: amount * price * (1 - fee),
    };
  }

  async getBestQuote(tokenIn: string, tokenOut: string, amount: number): Promise<DexQuote> {
    const [raydiumQuote, meteoraQuote] = await Promise.all([
      this.getRaydiumQuote(tokenIn, tokenOut, amount),
      this.getMeteorQuote(tokenIn, tokenOut, amount),
    ]);

    const bestQuote = raydiumQuote.outputAmount > meteoraQuote.outputAmount
      ? raydiumQuote
      : meteoraQuote;

    const difference = Math.abs(raydiumQuote.outputAmount - meteoraQuote.outputAmount);
    
    console.log(`🔄 [DEX Router] Raydium: ${raydiumQuote.outputAmount.toFixed(4)}, Meteora: ${meteoraQuote.outputAmount.toFixed(4)}`);
    console.log(`✅ [DEX Router] Selected: ${bestQuote.dex} (Better by ${difference.toFixed(4)})`);

    return bestQuote;
  }

  async executeSwap(dex: string, quote: DexQuote): Promise<ExecutionResult> {
    await this.sleep(2000 + Math.random() * 1000);
    
    // Simulate 5% chance of failure for retry logic
    if (Math.random() < 0.05) {
      throw new Error('Network error: Transaction timeout');
    }
    
    return {
      txHash: `0x${Date.now().toString(16)}${Math.random().toString(36).substring(2, 15)}`,
      executedPrice: quote.price,
      status: 'confirmed',
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}