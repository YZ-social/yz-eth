import { createBlock } from '@ethereumjs/block'
import { Common, Hardfork, Mainnet } from '@ethereumjs/common'
import { EVM } from '@ethereumjs/evm'
import { MerkleStateManager } from '@ethereumjs/statemanager'
import { createLegacyTx } from '@ethereumjs/tx'
import {
  Account,
  Address,
  bytesToHex,
  createAddressFromPrivateKey,
  createContractAddress,
  hexToBytes,
} from '@ethereumjs/util'
import { createVM, runTx } from '@ethereumjs/vm'
import { buildBlock } from '@ethereumjs/vm'
import { ethers } from 'ethers'

export interface Transaction {
  id: string
  type: 'deployment' | 'function_call' | 'contract_call' | 'eth_transfer' | 'account_creation'
  from: string
  to?: string
  data: string
  gasUsed: bigint
  gasPrice: bigint
  nonce: bigint
  value: bigint
  timestamp: number
  status: 'pending' | 'executed' | 'failed'
  error?: string
  errorDetails?: {
    reason: string
    gasUsed: bigint
    revertData?: string
    opcode?: string
  }
  contractAddress?: string
  functionName?: string
  functionArgs?: any[]
  returnValue?: string
  logs: LogEntry[]
  metadata: TransactionMetadata
  // For contract-to-contract calls
  internalCalls?: {
    from: string
    to: string
    functionName: string
    args: any[]
    returnValue?: string
    gasUsed: bigint
  }[]
}

export interface LogEntry {
  address: string
  topics: string[]
  data: string
  blockNumber: bigint
  transactionIndex: number
  logIndex: number
}

export interface TransactionMetadata {
  blockNumber: bigint
  transactionIndex: number
  gasLimit: bigint
  effectiveGasPrice: bigint
  cumulativeGasUsed: bigint
  status: boolean
  events: LogEntry[]
}

export interface AccountInfo {
  address: string
  balance: bigint
  nonce: bigint
  code: string
  isContract: boolean
}

export interface BlockState {
  blockNumber: bigint
  timestamp: bigint
  gasLimit: bigint
  gasUsed: bigint
  transactions: Transaction[]
  stateRoot: string
  blockHash: string
  accounts: Map<string, AccountInfo>
  totalAccounts: number
}

export class BlockManager {
  private vm: any
  private common: Common
  private stateManager: MerkleStateManager
  private defaultAddress: Address
  private defaultPrivateKey: Uint8Array
  private currentBlock: BlockState
  private blockBuilder: any
  private parentBlock: any
  private transactionCounter: number = 0
  private accounts: Map<string, AccountInfo> = new Map()
  private createdAccounts: Set<string> = new Set()
  private accountPrivateKeys: Map<string, Uint8Array> = new Map()

  constructor() {
    this.common = new Common({ chain: Mainnet, hardfork: Hardfork.Berlin })
    this.stateManager = new MerkleStateManager()
    this.vm = null
    this.defaultPrivateKey = hexToBytes(
      '0x1234567890123456789012345678901234567890123456789012345678901234',
    )
    this.defaultAddress = createAddressFromPrivateKey(this.defaultPrivateKey)

    // Initialize empty block
    this.currentBlock = {
      blockNumber: BigInt(0),
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
      gasLimit: BigInt(30000000), // 30M gas limit
      gasUsed: BigInt(0),
      transactions: [],
      stateRoot: '',
      blockHash: '',
      accounts: new Map(),
      totalAccounts: 0,
    }
  }

  async initialize() {
    try {
      if (!this.vm) {
        this.vm = await createVM({ common: this.common, stateManager: this.stateManager })

        // Ensure the default account exists with some balance
        const account = await this.stateManager.getAccount(this.defaultAddress)
        if (!account || account.balance === BigInt(0)) {
          const newAccount = new Account(BigInt(0), BigInt(1000000000000000000n)) // 1 ETH
          await this.stateManager.putAccount(this.defaultAddress, newAccount)
          
          // Create a transaction record for the initial account creation
          const initialAccountTransaction: Transaction = {
            id: `tx_${++this.transactionCounter}`,
            type: 'account_creation',
            from: '0x0000000000000000000000000000000000000000', // Genesis address
            to: this.defaultAddress.toString(),
            data: '0x', // Empty data for account creation
            gasUsed: BigInt(0),
            gasPrice: BigInt(20000000000), // 20 gwei
            nonce: BigInt(0),
            value: BigInt(1000000000000000000n), // 1 ETH
            timestamp: Date.now(),
            status: 'executed',
            logs: [],
            metadata: {
              blockNumber: this.currentBlock.blockNumber,
              transactionIndex: this.currentBlock.transactions.length,
              gasLimit: BigInt(0), // No gas used for account creation
              effectiveGasPrice: BigInt(20000000000),
              cumulativeGasUsed: BigInt(0),
              status: true,
              events: [],
            },
          }

          // Add transaction to current block
          this.currentBlock.transactions.push(initialAccountTransaction)
        }

        // Initialize accounts tracking
        await this.updateAccountsTracking()
      }
    } catch (error) {
      console.error('Error initializing VM:', error)
      throw error
    }

    // Create genesis block as parent
    this.parentBlock = createBlock(
      {
        header: {
          number: BigInt(0),
          gasLimit: this.currentBlock.gasLimit,
          timestamp: this.currentBlock.timestamp - BigInt(1),
        },
      },
      { common: this.common },
    )

    // Initialize block builder
    try {
      this.blockBuilder = await buildBlock(this.vm, {
        parentBlock: this.parentBlock,
        headerData: {
          number: this.currentBlock.blockNumber,
          timestamp: this.currentBlock.timestamp,
          gasLimit: this.currentBlock.gasLimit,
        },
      })
    } catch (error) {
      console.error('Error initializing block builder:', error)
      throw error
    }
  }

  async getNonce(): Promise<bigint> {
    const account = await this.stateManager.getAccount(this.defaultAddress)
    return account?.nonce ?? BigInt(0)
  }

  /**
   * Create a new account with initial balance
   */
  async createAccount(initialBalance: bigint = BigInt('1000000000000000000')): Promise<string> {
    const privateKey = this.generateRandomPrivateKey()
    const address = createAddressFromPrivateKey(privateKey)

    const account = new Account(BigInt(0), initialBalance)
    await this.stateManager.putAccount(address, account)

    // Track the created account and its private key
    this.createdAccounts.add(address.toString())
    this.accountPrivateKeys.set(address.toString(), privateKey)

    // Create a transaction record for account creation
    const transaction: Transaction = {
      id: `tx_${++this.transactionCounter}`,
      type: 'account_creation',
      from: this.defaultAddress.toString(),
      to: address.toString(),
      data: '0x', // Empty data for account creation
      gasUsed: BigInt(0),
      gasPrice: BigInt(20000000000), // 20 gwei
      nonce: await this.getNonce(),
      value: initialBalance,
      timestamp: Date.now(),
      status: 'executed',
      logs: [],
      metadata: {
        blockNumber: this.currentBlock.blockNumber,
        transactionIndex: this.currentBlock.transactions.length,
        gasLimit: BigInt(0), // No gas used for account creation
        effectiveGasPrice: BigInt(20000000000),
        cumulativeGasUsed: BigInt(0),
        status: true,
        events: [],
      },
    }

    // Add transaction to current block
    this.currentBlock.transactions.push(transaction)

    // Update accounts tracking
    await this.updateAccountsTracking()

    return address.toString()
  }

  /**
   * Transfer ETH between accounts
   */
  async transferETH(fromAddress: string, toAddress: string, amount: bigint): Promise<Transaction> {
    // Get the private key for the sending account
    let privateKey: Uint8Array
    if (fromAddress === this.defaultAddress.toString()) {
      privateKey = this.defaultPrivateKey
    } else {
      const storedPrivateKey = this.accountPrivateKeys.get(fromAddress)
      if (!storedPrivateKey) {
        throw new Error(`Private key not found for account ${fromAddress}`)
      }
      privateKey = storedPrivateKey
    }

    // Get the nonce for the sending account
    const fromAddressBytes = hexToBytes(fromAddress as `0x${string}`)
    const fromAccount = await this.stateManager.getAccount(new Address(fromAddressBytes))
    const nonce = fromAccount?.nonce ?? BigInt(0)
    const gasPrice = BigInt(20000000000) // 20 gwei

    const transaction: Transaction = {
      id: `tx_${++this.transactionCounter}`,
      type: 'eth_transfer',
      from: fromAddress,
      to: toAddress,
      data: '0x', // Empty data for ETH transfer
      gasUsed: BigInt(0),
      gasPrice,
      nonce,
      value: amount,
      timestamp: Date.now(),
      status: 'pending',
      logs: [],
      metadata: {
        blockNumber: this.currentBlock.blockNumber,
        transactionIndex: this.currentBlock.transactions.length,
        gasLimit: BigInt(21000), // Standard ETH transfer gas
        effectiveGasPrice: gasPrice,
        cumulativeGasUsed: BigInt(0),
        status: false,
        events: [],
      },
    }

    try {
      // Create and execute transaction
      const txData = {
        to: hexToBytes(toAddress as `0x${string}`),
        data: hexToBytes('0x'),
        gasLimit: BigInt(21000),
        gasPrice,
        value: amount,
        nonce,
      }

      const tx = createLegacyTx(txData, { common: this.common }).sign(privateKey)

      // Add transaction to block builder
      const result = await this.blockBuilder.addTransaction(tx)

      // Update transaction with results
      transaction.gasUsed = result.totalGasSpent
      transaction.status = 'executed'
      transaction.metadata.status = true
      transaction.metadata.cumulativeGasUsed = result.totalGasSpent

      // Format logs
      if (result.execResult.logs) {
        for (const log of result.execResult.logs) {
          const [address, topics, logData] = log
          const logEntry: LogEntry = {
            address: bytesToHex(address),
            topics: topics.map((topic: Uint8Array) => bytesToHex(topic)),
            data: bytesToHex(logData),
            blockNumber: this.currentBlock.blockNumber,
            transactionIndex: this.currentBlock.transactions.length,
            logIndex: transaction.logs.length,
          }
          transaction.logs.push(logEntry)
          transaction.metadata.events.push(logEntry)
        }
      }

      // Update block state
      this.currentBlock.transactions.push(transaction)
      this.currentBlock.gasUsed += transaction.gasUsed

      // Update accounts tracking
      await this.updateAccountsTracking()
    } catch (error) {
      transaction.status = 'failed'
      transaction.error = error instanceof Error ? error.message : String(error)
      this.currentBlock.transactions.push(transaction)
    }

    return transaction
  }

  async addTransaction(
    type: 'deployment' | 'function_call',
    data: string,
    to?: string,
    functionName?: string,
    functionArgs?: any[],
  ): Promise<Transaction> {
    const nonce = await this.getNonce()
    const gasPrice = BigInt(20000000000) // 20 gwei

    // Ensure data has 0x prefix and is valid hex
    const normalizedData = data.startsWith('0x') ? data : `0x${data}`

    // Validate hex string
    if (!/^0x[0-9a-fA-F]*$/.test(normalizedData)) {
      throw new Error(`Invalid hex string: ${normalizedData}`)
    }

    const transaction: Transaction = {
      id: `tx_${++this.transactionCounter}`,
      type,
      from: this.defaultAddress.toString(),
      to,
      data: normalizedData,
      gasUsed: BigInt(0),
      gasPrice,
      nonce,
      value: BigInt(0),
      timestamp: Date.now(),
      status: 'pending',
      functionName,
      functionArgs,
      logs: [],
      metadata: {
        blockNumber: this.currentBlock.blockNumber,
        transactionIndex: this.currentBlock.transactions.length,
        gasLimit: BigInt(5000000),
        effectiveGasPrice: gasPrice,
        cumulativeGasUsed: BigInt(0),
        status: false,
        events: [],
      },
    }

    try {
      // Create and execute transaction
      const txData = {
        to: to ? hexToBytes(to as `0x${string}`) : undefined,
        data: hexToBytes(normalizedData as `0x${string}`),
        gasLimit: BigInt(5000000),
        gasPrice,
        value: BigInt(0),
        nonce,
      }

      const tx = createLegacyTx(txData, { common: this.common }).sign(this.defaultPrivateKey)

      // Add transaction to block builder
      const result = await this.blockBuilder.addTransaction(tx)

      // Update transaction with results
      transaction.gasUsed = result.totalGasSpent
      transaction.status = 'executed'
      transaction.metadata.status = true
      transaction.metadata.cumulativeGasUsed = result.totalGasSpent

      if (type === 'deployment') {
        transaction.contractAddress = result.createdAddress?.toString()
      }

      if (result.execResult.returnValue.length > 0) {
        transaction.returnValue = bytesToHex(result.execResult.returnValue)
      }

      // Format logs
      if (result.execResult.logs) {
        for (const log of result.execResult.logs) {
          const [address, topics, logData] = log
          const logEntry: LogEntry = {
            address: bytesToHex(address),
            topics: topics.map((topic: Uint8Array) => bytesToHex(topic)),
            data: bytesToHex(logData),
            blockNumber: this.currentBlock.blockNumber,
            transactionIndex: this.currentBlock.transactions.length,
            logIndex: transaction.logs.length,
          }
          transaction.logs.push(logEntry)
          transaction.metadata.events.push(logEntry)
        }
      }

      // Update block state
      this.currentBlock.transactions.push(transaction)
      this.currentBlock.gasUsed += transaction.gasUsed

      // Update accounts tracking
      await this.updateAccountsTracking()
    } catch (error) {
      transaction.status = 'failed'
      transaction.error = error instanceof Error ? error.message : String(error)
      this.currentBlock.transactions.push(transaction)
    }

    return transaction
  }

  async executeContractFunction(
    contractAddress: string,
    abi: any[],
    functionName: string,
    args: any[] = [],
  ): Promise<Transaction> {
    const nonce = await this.getNonce()
    const gasPrice = BigInt(20000000000) // 20 gwei

    const iface = new ethers.Interface(abi)
    const functionFragment = iface.getFunction(functionName)

    if (!functionFragment) {
      throw new Error(`Function ${functionName} not found in ABI`)
    }

    const data = iface.encodeFunctionData(functionFragment, args)

    const transaction: Transaction = {
      id: `tx_${++this.transactionCounter}`,
      type: 'function_call',
      from: this.defaultAddress.toString(),
      to: contractAddress,
      data: data,
      gasUsed: BigInt(0),
      gasPrice,
      nonce,
      value: BigInt(0),
      timestamp: Date.now(),
      status: 'pending',
      functionName,
      functionArgs: args,
      logs: [],
      metadata: {
        blockNumber: this.currentBlock.blockNumber,
        transactionIndex: this.currentBlock.transactions.length,
        gasLimit: BigInt(5000000),
        effectiveGasPrice: gasPrice,
        cumulativeGasUsed: BigInt(0),
        status: false,
        events: [],
      },
    }

    try {
      const txData = {
        to: hexToBytes(contractAddress as `0x${string}`),
        data: hexToBytes(data as `0x${string}`),
        gasLimit: BigInt(5000000),
        gasPrice,
        value: BigInt(0),
        nonce,
      }

      const tx = createLegacyTx(txData, { common: this.common }).sign(this.defaultPrivateKey)
      const result = await this.blockBuilder.addTransaction(tx)

      transaction.gasUsed = result.totalGasSpent
      transaction.status = 'executed'
      transaction.metadata.status = true
      transaction.metadata.cumulativeGasUsed = result.totalGasSpent

      if (result.execResult.returnValue.length > 0) {
        const returnData = bytesToHex(result.execResult.returnValue)
        try {
          // Try to decode the return value using the ABI
          const decoded = iface.decodeFunctionResult(functionFragment, returnData)
          // Convert decoded result to readable format
          if (decoded.length === 1) {
            // Single return value
            transaction.returnValue = decoded[0].toString()
          } else if (decoded.length > 1) {
            // Multiple return values
            transaction.returnValue = decoded.map((val: any) => val.toString()).join(', ')
          } else {
            // No return values
            transaction.returnValue = 'success'
          }
        } catch (decodeError) {
          // Fallback to raw hex if decoding fails
          transaction.returnValue = returnData
        }
      }

      // Format logs
      if (result.execResult.logs) {
        for (const log of result.execResult.logs) {
          const [address, topics, logData] = log
          const logEntry: LogEntry = {
            address: bytesToHex(address),
            topics: topics.map((topic: Uint8Array) => bytesToHex(topic)),
            data: bytesToHex(logData),
            blockNumber: this.currentBlock.blockNumber,
            transactionIndex: this.currentBlock.transactions.length,
            logIndex: transaction.logs.length,
          }
          transaction.logs.push(logEntry)
          transaction.metadata.events.push(logEntry)
        }
      }

      this.currentBlock.transactions.push(transaction)
      this.currentBlock.gasUsed += transaction.gasUsed

      // Update accounts tracking
      await this.updateAccountsTracking()
    } catch (error) {
      transaction.status = 'failed'
      transaction.error = error instanceof Error ? error.message : String(error)
      
      // Enhanced error details for failed transactions
      transaction.errorDetails = {
        reason: error instanceof Error ? error.message : String(error),
        gasUsed: transaction.gasUsed,
        revertData: error instanceof Error ? error.stack : undefined,
        opcode: 'REVERT'
      }
      
      this.currentBlock.transactions.push(transaction)
    }

    return transaction
  }

  /**
   * Execute a contract function call from another contract (contract-to-contract call)
   */
  async executeContractToContractCall(
    fromContractAddress: string,
    toContractAddress: string,
    abi: any[],
    functionName: string,
    args: any[] = [],
    value: bigint = BigInt(0)
  ): Promise<Transaction> {
    const nonce = await this.getNonce()
    const gasPrice = BigInt(20000000000) // 20 gwei

    const iface = new ethers.Interface(abi)
    const functionFragment = iface.getFunction(functionName)

    if (!functionFragment) {
      throw new Error(`Function ${functionName} not found in ABI`)
    }

    const data = iface.encodeFunctionData(functionFragment, args)

    const transaction: Transaction = {
      id: `tx_${++this.transactionCounter}`,
      type: 'contract_call',
      from: fromContractAddress,
      to: toContractAddress,
      data: data,
      gasUsed: BigInt(0),
      gasPrice,
      nonce,
      value,
      timestamp: Date.now(),
      status: 'pending',
      functionName,
      functionArgs: args,
      logs: [],
      internalCalls: [],
      metadata: {
        blockNumber: this.currentBlock.blockNumber,
        transactionIndex: this.currentBlock.transactions.length,
        gasLimit: BigInt(5000000),
        effectiveGasPrice: gasPrice,
        cumulativeGasUsed: BigInt(0),
        status: false,
        events: [],
      },
    }

    try {
      const txData = {
        to: hexToBytes(toContractAddress as `0x${string}`),
        data: hexToBytes(data as `0x${string}`),
        gasLimit: BigInt(5000000),
        gasPrice,
        value,
        nonce,
      }

      const tx = createLegacyTx(txData, { common: this.common }).sign(this.defaultPrivateKey)
      const result = await this.blockBuilder.addTransaction(tx)

      transaction.gasUsed = result.totalGasSpent
      transaction.status = 'executed'
      transaction.metadata.status = true
      transaction.metadata.cumulativeGasUsed = result.totalGasSpent

      if (result.execResult.returnValue.length > 0) {
        const returnData = bytesToHex(result.execResult.returnValue)
        try {
          // Try to decode the return value using the ABI
          const decoded = iface.decodeFunctionResult(functionFragment, returnData)
          // Convert decoded result to readable format
          if (decoded.length === 1) {
            // Single return value
            transaction.returnValue = decoded[0].toString()
          } else if (decoded.length > 1) {
            // Multiple return values
            transaction.returnValue = decoded.map((val: any) => val.toString()).join(', ')
          } else {
            // No return values
            transaction.returnValue = 'success'
          }
        } catch (decodeError) {
          // Fallback to raw hex if decoding fails
          transaction.returnValue = returnData
        }
      }

      // Format logs
      if (result.execResult.logs) {
        for (const log of result.execResult.logs) {
          const [address, topics, logData] = log
          const logEntry: LogEntry = {
            address: bytesToHex(address),
            topics: topics.map((topic: Uint8Array) => bytesToHex(topic)),
            data: bytesToHex(logData),
            blockNumber: this.currentBlock.blockNumber,
            transactionIndex: this.currentBlock.transactions.length,
            logIndex: transaction.logs.length,
          }
          transaction.logs.push(logEntry)
          transaction.metadata.events.push(logEntry)
        }
      }

      this.currentBlock.transactions.push(transaction)
      this.currentBlock.gasUsed += transaction.gasUsed

      // Update accounts tracking
      await this.updateAccountsTracking()
    } catch (error) {
      transaction.status = 'failed'
      transaction.error = error instanceof Error ? error.message : String(error)
      
      // Enhanced error details for failed transactions
      transaction.errorDetails = {
        reason: error instanceof Error ? error.message : String(error),
        gasUsed: transaction.gasUsed,
        revertData: error instanceof Error ? error.stack : undefined,
        opcode: 'REVERT'
      }
      
      this.currentBlock.transactions.push(transaction)
    }

    return transaction
  }

  async finalizeBlock(): Promise<BlockState> {
    if (this.blockBuilder) {
      const block = await this.blockBuilder.build()
      this.currentBlock.stateRoot = bytesToHex(block.header.stateRoot)
      this.currentBlock.blockHash = bytesToHex(block.hash())
    }
    return this.currentBlock
  }

  getCurrentBlock(): BlockState {
    return this.currentBlock
  }

  getTransactions(): Transaction[] {
    return this.currentBlock.transactions
  }

  getAccounts(): AccountInfo[] {
    return Array.from(this.accounts.values())
  }

  getAccountBalance(address: string): bigint {
    const account = this.accounts.get(address)
    return account ? account.balance : BigInt(0)
  }

  getAllLogs(): LogEntry[] {
    const allLogs: LogEntry[] = []
    for (const tx of this.currentBlock.transactions) {
      allLogs.push(...tx.logs)
    }
    return allLogs
  }

  private async updateAccountsTracking() {
    this.accounts.clear()

    // Track the default account
    const defaultAccount = await this.stateManager.getAccount(this.defaultAddress)
    if (defaultAccount) {
      this.accounts.set(this.defaultAddress.toString(), {
        address: this.defaultAddress.toString(),
        balance: defaultAccount.balance,
        nonce: defaultAccount.nonce,
        code: bytesToHex(defaultAccount.codeHash),
        isContract: defaultAccount.codeHash.length > 0,
      })
    }

    // Track all other accounts that have been created
    for (const accountAddress of this.createdAccounts) {
      const account = await this.stateManager.getAccount(
        new Address(hexToBytes(accountAddress as `0x${string}`)),
      )
      if (account) {
        this.accounts.set(accountAddress, {
          address: accountAddress,
          balance: account.balance,
          nonce: account.nonce,
          code: bytesToHex(account.codeHash),
          isContract: account.codeHash.length > 0,
        })
      }
    }

    // Update block state
    this.currentBlock.accounts = this.accounts
    this.currentBlock.totalAccounts = this.accounts.size
  }

  private generateRandomPrivateKey(): Uint8Array {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return array
  }

  async reset(): Promise<void> {
    this.vm = null
    this.stateManager = new MerkleStateManager()
    this.accounts.clear()
    this.createdAccounts.clear()
    this.accountPrivateKeys.clear()
    this.currentBlock = {
      blockNumber: BigInt(0),
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
      gasLimit: BigInt(30000000),
      gasUsed: BigInt(0),
      transactions: [],
      stateRoot: '',
      blockHash: '',
      accounts: new Map(),
      totalAccounts: 0,
    }
    this.transactionCounter = 0
  }
}
