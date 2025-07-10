import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { SolidityExecutor } from '../src/solidityExecutor'
import { BlockManager } from '../src/blockManager'

describe('Web Worker Solc Integration', () => {
  let executor: SolidityExecutor
  let blockManager: BlockManager

  beforeAll(async () => {
    blockManager = new BlockManager()
    await blockManager.initialize()
    executor = new SolidityExecutor(blockManager)
  })

  afterAll(() => {
    executor.destroy?.()
  })

  it('should compile a simple Solidity contract using web worker solc', async () => {
    const sourceCode = `
      // SPDX-License-Identifier: MIT
      pragma solidity ^0.8.0;
      
      contract Simple {
          function main() public pure returns (string memory) {
              return "Hello from EthereumJS!";
          }
      }
    `

    const contracts = await executor.compileSolidity(sourceCode)

    expect(contracts).toHaveLength(1)
    expect(contracts[0].contractName).toBe('Simple')
    expect(contracts[0].bytecode).toBeTruthy()
    expect(contracts[0].abi).toBeTruthy()
    expect(contracts[0].abi).toHaveLength(1)
    expect(contracts[0].abi[0].name).toBe('main')
  })

  it('should handle compilation errors gracefully', async () => {
    const sourceCode = `
      pragma solidity ^0.8.0;
      
      contract Simple {
          function main() public pure returns (string memory) {
              return "Hello from EthereumJS!";
          }
      // Missing closing brace
    `

    await expect(executor.compileSolidity(sourceCode)).rejects.toThrow('Compilation failed')
  })

  it('should execute a simple contract with main function', async () => {
    const sourceCode = `
      // SPDX-License-Identifier: MIT
      pragma solidity ^0.8.0;
      
      contract Simple {
          function main() public pure returns (string memory) {
              return "Hello from EthereumJS!";
          }
      }
    `

    const result = await executor.executeSolidity(sourceCode)

    // With BlockManager integration, execution should work in both environments
    expect(result.success).toBe(true)
    expect(result.output).toContain('deployed')
    expect(result.output).toContain('Function main executed successfully')
  })
})
