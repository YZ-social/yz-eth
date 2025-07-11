import { bytesToHex } from '@ethereumjs/util'
import { ethers } from 'ethers'
import { BlockManager, LogEntry } from './blockManager'

export interface ExecutionResult {
  success: boolean
  output: string
  gasUsed: bigint
  logs: LogEntry[] // Changed from string[] to LogEntry[] for consistency
  error?: string
  transactionId?: string
  contractAddress?: string
}

export interface CompiledContract {
  bytecode: string
  abi: any[]
  contractName: string
}

class SolcWorker {
  private worker: Worker | null = null
  public ready = false
  private messageQueue: Array<{ resolve: Function; reject: Function; id: string }> = []
  private messageId = 0

  constructor() {
    this.initWorker()
  }

  private initWorker() {
    try {
      // Use the real bundled solc worker
      this.worker = new Worker('/solc-worker-bundle.js')

      this.worker.onmessage = (event) => {
        const { type, success, output, version, error } = event.data

        if (type === 'ready') {
          this.ready = true
          console.log('Solc worker ready')
        } else if (type === 'compileResult' || type === 'versionResult') {
          // Find and resolve the corresponding promise
          const message = this.messageQueue.find((msg) => msg.id === type)
          if (message) {
            this.messageQueue = this.messageQueue.filter((msg) => msg.id !== type)
            if (success) {
              message.resolve({ output, version })
            } else {
              message.reject(new Error(error))
            }
          }
        } else if (type === 'error') {
          // Reject all pending messages
          this.messageQueue.forEach((msg) => msg.reject(new Error(error)))
          this.messageQueue = []
        }
      }

      this.worker.onerror = (error) => {
        console.error('Worker error:', error)
        this.messageQueue.forEach((msg) => msg.reject(error))
        this.messageQueue = []
      }
    } catch (error) {
      console.error('Failed to initialize solc worker:', error)
      throw error
    }
  }

  async compile(input: any): Promise<any> {
    if (!this.worker || !this.ready) {
      throw new Error('Worker not ready')
    }

    return new Promise((resolve, reject) => {
      this.messageQueue.push({ resolve, reject, id: 'compileResult' })
      this.worker!.postMessage({ type: 'compile', input })
    })
  }

  async getVersion(): Promise<string> {
    if (!this.worker || !this.ready) {
      throw new Error('Worker not ready')
    }

    return new Promise((resolve, reject) => {
      this.messageQueue.push({ resolve, reject, id: 'versionResult' })
      this.worker!.postMessage({ type: 'version' })
    })
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.ready = false
    this.messageQueue = []
  }
}

// Global worker instance
let solcWorker: SolcWorker | null = null

async function getSolc(): Promise<any> {
  if (typeof window !== 'undefined') {
    // Browser environment - use web worker
    if (!solcWorker) {
      solcWorker = new SolcWorker()
    }

    // Wait for worker to be ready
    let attempts = 0
    while (!solcWorker.ready && attempts < 50) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      attempts++
    }

    if (!solcWorker.ready) {
      throw new Error('Solc worker failed to initialize')
    }

    return solcWorker
  }

  // Node.js environment - fallback to regular solc
  try {
    const solcModule = await import('solc')
    return solcModule.default || solcModule
  } catch (error) {
    console.error('Failed to load Node.js solc:', error)
    throw new Error('Failed to load Solidity compiler')
  }
}

export class SolidityExecutor {
  private blockManager: BlockManager // Now required, not optional
  public lastCompiledAbi: any[] | null = null
  public lastCompiledName: string | null = null
  private contractAbiMap: Map<string, { name: string; abi: any[] }> = new Map()

  constructor(blockManager: BlockManager) {
    // BlockManager is now required for consistent blockchain behavior
    if (!blockManager) {
      throw new Error('BlockManager is required for SolidityExecutor')
    }
    
    this.blockManager = blockManager
  }



  /**
   * Compile Solidity source code
   */
  async compileSolidity(sourceCode: string): Promise<CompiledContract[]> {
    try {
      console.log('Getting solc compiler...')
      const solc = await getSolc()
      console.log('Solc compiler obtained:', !!solc)

      const input = {
        language: 'Solidity',
        sources: {
          'contract.sol': {
            content: sourceCode,
          },
        },
        settings: {
          outputSelection: {
            '*': {
              '*': ['abi', 'evm.bytecode'],
            },
          },
        },
      }

      console.log('Compiling with input:', JSON.stringify(input, null, 2))

      let output
      if (typeof window !== 'undefined' && solc instanceof SolcWorker) {
        // Browser environment - use web worker
        const result = await solc.compile(input)
        output = result.output
      } else {
        // Node.js environment - use regular solc
        output = JSON.parse(solc.compile(JSON.stringify(input)))
      }

      console.log('Compilation output:', output)

      if (output.errors) {
        const errors = output.errors.filter((error: any) => error.severity === 'error')
        if (errors.length > 0) {
          throw new Error(
            `Compilation failed:\n${errors.map((e: any) => e.formattedMessage).join('\n')}`,
          )
        }
      }

      const contracts: CompiledContract[] = []

      if (output.contracts && output.contracts['contract.sol']) {
        for (const [contractName, contractData] of Object.entries(
          output.contracts['contract.sol'],
        )) {
          const contract = contractData as any
          if (contract.evm && contract.evm.bytecode && contract.evm.bytecode.object) {
            contracts.push({
              bytecode: contract.evm.bytecode.object,
              abi: contract.abi || [],
              contractName: contractName,
            })
          }
        }
      }

      return contracts
    } catch (error) {
      console.error('Compilation error:', error)
      throw error
    }
  }





  /**
   * Deploy Solidity contract without executing any functions
   */
  async deploySolidity(sourceCode: string): Promise<ExecutionResult> {
    try {
      // Compile the code
      const contracts = await this.compileSolidity(sourceCode)

      if (contracts.length === 0) {
        return {
          success: false,
          output: 'No contracts found in the compiled code',
          gasUsed: BigInt(0),
          logs: [],
          error: 'No contracts found',
        }
      }

      const contract = contracts[0]

      // Store the compiled contract information for later retrieval
      this.storeCompiledContractInfo(contract.contractName, contract.abi)

      // Ensure bytecode is a string and has proper format
      let bytecode = contract.bytecode
      if (typeof bytecode !== 'string') {
        bytecode = String(bytecode)
      }

      // Remove any whitespace and ensure 0x prefix
      bytecode = bytecode.trim()
      if (!bytecode.startsWith('0x')) {
        bytecode = `0x${bytecode}`
      }

      // Deploy contract to block (deployment only, no function execution)
      const deploymentTx = await this.blockManager.addTransaction('deployment', bytecode)

      if (deploymentTx.status === 'failed') {
        return {
          success: false,
          output: '',
          gasUsed: BigInt(0),
          logs: [],
          error: deploymentTx.error || 'Contract deployment failed',
        }
      }

      // Store the contract info by its deployed address
      if (deploymentTx.contractAddress) {
        this.storeContractByAddress(
          deploymentTx.contractAddress,
          contract.contractName,
          contract.abi,
        )
      }

      return {
        success: true,
        output: `Contract "${contract.contractName}" deployed successfully at ${deploymentTx.contractAddress}\nReady for function execution via Dashboard.`,
        gasUsed: deploymentTx.gasUsed,
        logs: deploymentTx.logs,
        transactionId: deploymentTx.id,
        contractAddress: deploymentTx.contractAddress,
      }
    } catch (error) {
      return {
        success: false,
        output: '',
        gasUsed: BigInt(0),
        logs: [],
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Execute Solidity code and return results (includes deployment + main function execution)
   */
  async executeSolidity(sourceCode: string): Promise<ExecutionResult> {
    try {
      // Compile the code
      const contracts = await this.compileSolidity(sourceCode)

      if (contracts.length === 0) {
        return {
          success: false,
          output: 'No contracts found in the compiled code',
          gasUsed: BigInt(0),
          logs: [],
          error: 'No contracts found',
        }
      }

      const contract = contracts[0]

      // Store the compiled contract information for later retrieval
      this.storeCompiledContractInfo(contract.contractName, contract.abi)

      // Ensure bytecode is a string and has proper format
      let bytecode = contract.bytecode
      if (typeof bytecode !== 'string') {
        bytecode = String(bytecode)
      }

      // Remove any whitespace and ensure 0x prefix
      bytecode = bytecode.trim()
      if (!bytecode.startsWith('0x')) {
        bytecode = `0x${bytecode}`
      }

      // Deploy contract to block
      const deploymentTx = await this.blockManager.addTransaction('deployment', bytecode)

      if (deploymentTx.status === 'failed') {
        return {
          success: false,
          output: '',
          gasUsed: BigInt(0),
          logs: [],
          error: deploymentTx.error || 'Contract deployment failed',
        }
      }

      // Store the contract info by its deployed address
      if (deploymentTx.contractAddress) {
        this.storeContractByAddress(
          deploymentTx.contractAddress,
          contract.contractName,
          contract.abi,
        )
      }

      // Look for a main function to execute
      const mainFunction = contract.abi.find(
        (item: any) =>
          item.type === 'function' &&
          (item.name === 'main' || item.name === 'test' || item.name === 'run'),
      )

      if (mainFunction && deploymentTx.contractAddress) {
        try {
          // Execute the main function on the block
          const functionTx = await this.blockManager.executeContractFunction(
            deploymentTx.contractAddress,
            contract.abi,
            mainFunction.name,
          )

          let output = `Contract "${contract.contractName}" deployed at ${deploymentTx.contractAddress}\nFunction ${mainFunction.name} executed successfully`

          // Include the actual return value if available
          if (functionTx.returnValue) {
            output += `\nReturn value: ${functionTx.returnValue}`
          }

          return {
            success: functionTx.status === 'executed',
            output: output,
            gasUsed: deploymentTx.gasUsed + functionTx.gasUsed,
            logs: [...deploymentTx.logs, ...functionTx.logs],
            transactionId: functionTx.id,
            contractAddress: deploymentTx.contractAddress,
          }
        } catch (functionError) {
          return {
            success: true,
            output: `Contract "${contract.contractName}" deployed successfully at ${deploymentTx.contractAddress}\nFunction execution failed: ${functionError instanceof Error ? functionError.message : String(functionError)}`,
            gasUsed: deploymentTx.gasUsed,
            logs: deploymentTx.logs,
            transactionId: deploymentTx.id,
            contractAddress: deploymentTx.contractAddress,
          }
        }
      } else {
        return {
          success: true,
          output: `Contract "${contract.contractName}" deployed successfully at ${deploymentTx.contractAddress}\nNo main function found to execute.`,
          gasUsed: deploymentTx.gasUsed,
          logs: deploymentTx.logs,
          transactionId: deploymentTx.id,
          contractAddress: deploymentTx.contractAddress,
        }
      }
    } catch (error) {
      return {
        success: false,
        output: '',
        gasUsed: BigInt(0),
        logs: [],
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Reset the executor state
   */
  async reset(): Promise<void> {
    // Reset contract storage
    this.contractAbiMap.clear()
    this.lastCompiledAbi = null
    this.lastCompiledName = null
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (solcWorker) {
      solcWorker.destroy()
      solcWorker = null
    }
  }

  private storeCompiledContractInfo(contractName: string, abi: any[]) {
    this.lastCompiledAbi = abi
    this.lastCompiledName = contractName
    console.log('Stored compiled contract info:', { name: contractName, abi })
  }

  // New method to store contract info by address
  public storeContractByAddress(address: string, name: string, abi: any[]) {
    this.contractAbiMap.set(address.toLowerCase(), { name, abi })
    console.log('📍 Stored contract by address:', { address, name, abiLength: abi.length })
  }

  // New method to get contract info by address
  public getContractByAddress(address: string): { name: string; abi: any[] } | null {
    const result = this.contractAbiMap.get(address.toLowerCase())
    console.log('🔍 Looking up contract by address:', { address, found: !!result })
    return result || null
  }

  // New method to get all stored contracts
  public getAllStoredContracts(): Array<{ address: string; name: string; abi: any[] }> {
    return Array.from(this.contractAbiMap.entries()).map(([address, info]) => ({
      address,
      name: info.name,
      abi: info.abi,
    }))
  }

  /**
   * Execute a contract-to-contract call
   */
  async executeContractToContractCall(
    fromContractAddress: string,
    toContractAddress: string,
    functionName: string,
    args: any[] = [],
    value: bigint = BigInt(0)
  ): Promise<ExecutionResult> {
    try {
      // Get the ABI for the target contract
      const targetContract = this.getContractByAddress(toContractAddress)
      if (!targetContract) {
        return {
          success: false,
          output: '',
          gasUsed: BigInt(0),
          logs: [],
          error: `Contract at address ${toContractAddress} not found`,
        }
      }

      // Execute the contract-to-contract call
      const tx = await this.blockManager.executeContractToContractCall(
        fromContractAddress,
        toContractAddress,
        targetContract.abi,
        functionName,
        args,
        value
      )

      if (tx.status === 'failed') {
        return {
          success: false,
          output: '',
          gasUsed: tx.gasUsed,
          logs: tx.logs,
          error: tx.error || 'Contract-to-contract call failed',
        }
      }

      return {
        success: true,
        output: `Contract-to-contract call executed successfully\nFunction: ${functionName}\nReturn value: ${tx.returnValue || 'None'}`,
        gasUsed: tx.gasUsed,
        logs: tx.logs,
        transactionId: tx.id,
        contractAddress: toContractAddress,
      }
    } catch (error) {
      return {
        success: false,
        output: '',
        gasUsed: BigInt(0),
        logs: [],
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }
}
