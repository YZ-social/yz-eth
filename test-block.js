'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const blockManager_js_1 = require('./src/blockManager.js')
const solidityExecutor_js_1 = require('./src/solidityExecutor.js')
async function testSimpleContract() {
  console.log('Testing Simple contract deployment...')
  try {
    // Initialize block manager
    const blockManager = new blockManager_js_1.BlockManager()
    await blockManager.initialize()
    console.log('✅ Block manager initialized')
    // Initialize executor with block manager
    const executor = new solidityExecutor_js_1.SolidityExecutor(blockManager)
    console.log('✅ Solidity executor initialized')
    // Simple contract code
    const simpleContract = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Simple {
    function main() public pure returns (string memory) {
        return "Hello from EthereumJS!";
    }
}`
    console.log('Compiling and executing Simple contract...')
    const result = await executor.executeSolidity(simpleContract)
    if (result.success) {
      console.log('✅ Contract executed successfully!')
      console.log('Output:', result.output)
      console.log('Gas used:', result.gasUsed.toString())
      console.log('Contract address:', result.contractAddress)
      // Check block state
      const block = blockManager.getCurrentBlock()
      console.log('Block transactions:', block.transactions.length)
      console.log('Block gas used:', block.gasUsed.toString())
      return true
    } else {
      console.log('❌ Contract execution failed:', result.error)
      return false
    }
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}
// Run the test
testSimpleContract().then((success) => {
  if (success) {
    console.log('🎉 All tests passed!')
  } else {
    console.log('💥 Tests failed!')
    process.exit(1)
  }
})
