import { beforeEach, describe, expect, it } from 'vitest'
import { SolidityExecutor } from '../src/solidityExecutor.ts'
import { BlockManager } from '../src/blockManager.ts'

describe('SolidityExecutor', () => {
  let executor: SolidityExecutor
  let blockManager: BlockManager

  beforeEach(async () => {
    blockManager = new BlockManager()
    await blockManager.initialize()
    executor = new SolidityExecutor(blockManager)
  })

  describe('executeSolidity', () => {
    it('should handle basic Solidity code', async () => {
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
      expect(result.output).toContain('Contract "Simple" deployed at')
      expect(result.output).toContain('Function main executed successfully')
    })

    it('should handle empty code', async () => {
      const result = await executor.executeSolidity('')

      expect(result.success).toBe(false)
      expect(result.error).toContain('No contracts found')
    })

    it('should handle malformed code gracefully', async () => {
      const malformedCode = `
        contract Broken {
            function main() public {
                // Missing closing brace
      `

      const result = await executor.executeSolidity(malformedCode)

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Compilation error|Compilation failed/)
    })
  })

  describe('reset', () => {
    it('should reset the executor state', async () => {
      await expect(executor.reset()).resolves.not.toThrow()
    })
  })
})
