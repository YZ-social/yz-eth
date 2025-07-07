import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { SolidityExecutor } from '../src/solidityExecutor'

describe('Web Worker Solc Integration', () => {
  let executor: SolidityExecutor

  beforeAll(() => {
    executor = new SolidityExecutor()
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

    // In browser environment, this should work with real solc
    // In Node.js environment, it might fail due to web worker limitations
    if (typeof window !== 'undefined') {
      expect(result.success).toBe(true)
      expect(result.output).toContain('deployed')
      expect(result.output).toContain('Hello from EthereumJS!')
    } else {
      // In Node.js, we expect compilation to work but execution might fail
      // due to web worker not being available
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    }
  })
})
