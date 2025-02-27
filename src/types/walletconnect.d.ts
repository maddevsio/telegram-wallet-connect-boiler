declare module '@walletconnect/ethereum-provider' {
  import { EventEmitter } from 'events';
  
  export class EthereumProvider extends EventEmitter {
    accounts: string[];
    chainId: number;
    
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    request<T = any>(args: { method: string; params?: any[] }): Promise<T>;
    
    on(event: string, listener: (...args: any[]) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
    off(event: string, listener: (...args: any[]) => void): this;
    
    static init(options: any): Promise<EthereumProvider>;
  }
} 