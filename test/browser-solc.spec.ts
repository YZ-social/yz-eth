import { beforeEach, describe, expect, it } from 'vitest'
import { SolidityExecutor } from '../src/solidityExecutor'
import { BlockManager } from '../src/blockManager'

describe('Browser Solc Integration', () => {
  let executor: SolidityExecutor
  let blockManager: BlockManager

  beforeEach(async () => {
    blockManager = new BlockManager()
    await blockManager.initialize()
    executor = new SolidityExecutor(blockManager)
  })

  it('should compile a simple Solidity contract using browser solc', async () => {
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

    expect(contracts).toBeDefined()
    expect(contracts.length).toBeGreaterThan(0)
    expect(contracts[0].contractName).toBe('Simple')
    expect(contracts[0].bytecode).toBeDefined()
    expect(contracts[0].abi).toBeDefined()
    expect(contracts[0].abi.length).toBeGreaterThan(0)
  })

  it('should handle compilation errors gracefully', async () => {
    const invalidSourceCode = `
      pragma solidity ^0.8.0;
      
      contract Simple {
          function main() public pure returns (string memory) {
              return "Hello from EthereumJS!";
          }
          // Missing closing brace
    `

    await expect(executor.compileSolidity(invalidSourceCode)).rejects.toThrow()
  })
})
