import { beforeEach, describe, expect, it } from 'vitest'
import { SolidityExecutor } from '../src/solidityExecutor.ts'

describe('Solidity Compilation', () => {
  let executor: SolidityExecutor

  beforeEach(() => {
    executor = new SolidityExecutor()
  })

  it('should compile a simple contract', async () => {
    const sourceCode = `
      // SPDX-License-Identifier: MIT
      pragma solidity ^0.8.0;
      
      contract Simple {
          function main() public pure returns (string memory) {
              return "Hello World";
          }
      }
    `

    const contracts = await executor.compileSolidity(sourceCode)

    expect(contracts).toHaveLength(1)
    expect(contracts[0].contractName).toBe('Simple')
    expect(contracts[0].bytecode).toBeTruthy()
    expect(contracts[0].abi).toBeInstanceOf(Array)
    expect(contracts[0].abi.length).toBeGreaterThan(0)
  })

  it('should handle compilation errors', async () => {
    const invalidCode = `
      contract Broken {
          function main() public {
              // Missing closing brace
    `

    await expect(executor.compileSolidity(invalidCode)).rejects.toThrow('Compilation failed')
  })

  it('should handle multiple contracts', async () => {
    const sourceCode = `
      // SPDX-License-Identifier: MIT
      pragma solidity ^0.8.0;
      
      contract Contract1 {
          function main() public pure returns (uint256) {
              return 42;
          }
      }
      
      contract Contract2 {
          function main() public pure returns (string memory) {
              return "Hello";
          }
      }
    `

    const contracts = await executor.compileSolidity(sourceCode)

    expect(contracts).toHaveLength(2)
    expect(contracts.map((c) => c.contractName)).toContain('Contract1')
    expect(contracts.map((c) => c.contractName)).toContain('Contract2')
  })

  it('should execute a simple contract', async () => {
    const sourceCode = `
      // SPDX-License-Identifier: MIT
      pragma solidity ^0.8.0;
      
      contract Simple {
          function main() public pure returns (string memory) {
              return "Hello World";
          }
      }
    `

    const result = await executor.executeSolidity(sourceCode)

    expect(result.success).toBe(true)
    expect(result.output).toContain('Function main called with args: []')
  })
})
