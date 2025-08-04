// TypeScript declarations for BlockchainModel.js

declare class BlockchainModel {
  // Multisynq Model methods
  init(): void;
  publish(domain: string, event: string, data?: any): void;
  subscribe(domain: string, event: string, handler: string | ((data: any) => void)): void;
  future(delay: number): any;
  now(): number;
  
  // Blockchain state properties
  blocks: any[];
  accounts: Array<{ address: string; balance: bigint }>;
  contracts: any[];
  currentBlockNumber: number;
  pendingTransactions: any[];
  heartbeatCount: number;
  
  // Blockchain methods
  createGenesisBlock(): void;
  createBlock(data?: any): void;
  executeTransaction(data: any): void;
  executeTransactionInternal(transaction: any): void;
  deployContract(data: any): void;
  handleCompiledContract(data: any): void;
  heartbeat(): void;
  autoMineBlock(): void;
  calculateModelHash(): string;
  
  // Utility methods
  generateBlockHash(blockNumber: number, timestamp: number, parentHash: string, transactions: any[]): string;
  generateContractAddress(): string;
  simpleHash(str: string): string;
  
  // Getter methods
  getBlocks(): any[];
  getContracts(): any[];
  getAccounts(): Array<{ address: string; balance: bigint }>;
  getPendingTransactions(): any[];
  getCurrentBlockNumber(): number;
}

export default BlockchainModel; 