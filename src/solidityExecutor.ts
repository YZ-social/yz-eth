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
import { ethers } from 'ethers'

export interface ExecutionResult {
  success: boolean
  output: string
  gasUsed: bigint
  logs: string[]
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
  private vm: any
  private common: Common
  private stateManager: MerkleStateManager
  private defaultAddress: Address
  private defaultPrivateKey: Uint8Array
  private blockManager?: any
  public lastCompiledAbi: any[] | null = null
  public lastCompiledName: string | null = null
  private contractAbiMap: Map<string, { name: string; abi: any[] }> = new Map()

  constructor(blockManager?: any) {
    // Use Berlin hardfork instead of London to avoid base fee issues
    this.common = new Common({ chain: Mainnet, hardfork: Hardfork.Berlin })
    this.stateManager = new MerkleStateManager()
    this.vm = null // Will be initialized in init()
    this.defaultPrivateKey = hexToBytes(
      '0x1234567890123456789012345678901234567890123456789012345678901234',
    )
    this.defaultAddress = createAddressFromPrivateKey(this.defaultPrivateKey)
    this.blockManager = blockManager
  }

  private async init() {
    if (!this.vm) {
      this.vm = await createVM({ common: this.common, stateManager: this.stateManager })
      // Ensure the default account exists with some balance
      const account = await this.stateManager.getAccount(this.defaultAddress)
      if (!account || account.balance === BigInt(0)) {
        const newAccount = new Account(BigInt(0), BigInt(1000000000000000000n)) // 1 ETH
        await this.stateManager.putAccount(this.defaultAddress, newAccount)
      }
    }
  }

  private async getNonce(): Promise<bigint> {
    const account = await this.stateManager.getAccount(this.defaultAddress)
    return account?.nonce ?? BigInt(0)
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
   * Deploy a contract and return its address
   */
  async deployContract(bytecode: string, constructorArgs: any[] = []): Promise<Address> {
    await this.init()

    // Normalize bytecode
    const normalizedBytecode = bytecode.startsWith('0x') ? bytecode : `0x${bytecode}`

    // Validate hex string
    if (!/^0x[0-9a-fA-F]*$/.test(normalizedBytecode)) {
      throw new Error(`Invalid bytecode: ${normalizedBytecode}`)
    }

    const nonce = await this.getNonce()
    const gasPrice = BigInt(20000000000) // 20 gwei

    // Encode constructor arguments if provided
    let data = normalizedBytecode
    if (constructorArgs.length > 0) {
      const iface = new ethers.Interface(['constructor()'])
      data = normalizedBytecode + iface.encodeDeploy(constructorArgs).slice(2)
    }

    const txData = {
      data: hexToBytes(data as `0x${string}`),
      gasLimit: BigInt(5000000),
      gasPrice,
      value: BigInt(0),
      nonce,
    }

    const tx = createLegacyTx(txData, { common: this.common }).sign(this.defaultPrivateKey)

    const result = await runTx(this.vm, { tx })

    if (result.execResult.exceptionError) {
      throw new Error(`Deployment failed: ${result.execResult.exceptionError.error}`)
    }

    return result.createdAddress!
  }

  /**
   * Call a contract function
   */
  async callContract(
    contractAddress: Address,
    abi: any[],
    functionName: string,
    args: any[] = [],
  ): Promise<ExecutionResult> {
    await this.init()

    const iface = new ethers.Interface(abi)
    const functionFragment = iface.getFunction(functionName)

    if (!functionFragment) {
      throw new Error(`Function ${functionName} not found in ABI`)
    }

    const data = iface.encodeFunctionData(functionFragment, args)
    const nonce = await this.getNonce()
    const gasPrice = BigInt(20000000000) // 20 gwei

    const txData = {
      to: contractAddress,
      data: hexToBytes(data as `0x${string}`),
      gasLimit: BigInt(5000000),
      gasPrice,
      value: BigInt(0),
      nonce,
    }

    const tx = createLegacyTx(txData, { common: this.common }).sign(this.defaultPrivateKey)

    const result = await runTx(this.vm, { tx })

    if (result.execResult.exceptionError) {
      return {
        success: false,
        output: '',
        gasUsed: result.totalGasSpent,
        logs: [],
        error: result.execResult.exceptionError.error,
      }
    }

    // Decode the return value
    let output = ''
    if (result.execResult.returnValue.length > 0) {
      try {
        const returnData = bytesToHex(result.execResult.returnValue)
        const decoded = iface.decodeFunctionResult(functionFragment, returnData)
        output = JSON.stringify(decoded, null, 2)
      } catch (error) {
        output = bytesToHex(result.execResult.returnValue)
      }
    }

    // Format logs
    const logs: string[] = []
    if (result.execResult.logs) {
      for (const log of result.execResult.logs) {
        const [address, topics, logData] = log
        logs.push(`Log: ${bytesToHex(address)} - ${bytesToHex(logData)}`)
      }
    }

    return {
      success: true,
      output,
      gasUsed: result.totalGasSpent,
      logs,
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

      // If block manager is available, use it for block-based deployment
      if (this.blockManager) {
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
      } else {
        // Fallback to original deployment method
        const contract = contracts[0]
        const contractAddress = await this.deployContract(contract.bytecode)

        // Store the contract info by its deployed address
        if (contractAddress) {
          this.storeContractByAddress(
            contractAddress.toString(),
            contract.contractName,
            contract.abi,
          )
        }

        return {
          success: true,
          output: `Contract "${contract.contractName}" deployed at: ${contractAddress.toString()}`,
          gasUsed: BigInt(0),
          logs: [],
          contractAddress: contractAddress.toString(),
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

      // If block manager is available, use it for block-based execution
      if (this.blockManager) {
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
      } else {
        // Fallback to original execution method
        const contract = contracts[0]
        const contractAddress = await this.deployContract(contract.bytecode)

        // Store the contract info by its deployed address
        if (contractAddress) {
          this.storeContractByAddress(
            contractAddress.toString(),
            contract.contractName,
            contract.abi,
          )
        }

        // Execute the main function if it exists
        if (contract.abi.find((func: any) => func.name === 'main')) {
          console.log('Executing main function...')
          const mainTx = await this.callContract(contractAddress, contract.abi, 'main')
          console.log('Main function executed:', mainTx)
        }

        return {
          success: true,
          output: `Contract deployed at: ${contractAddress.toString()}`,
          gasUsed: BigInt(0),
          logs: [],
          contractAddress: contractAddress.toString(),
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
   * Reset the VM state
   */
  async reset(): Promise<void> {
    this.vm = null
    this.stateManager = new MerkleStateManager()
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
}
