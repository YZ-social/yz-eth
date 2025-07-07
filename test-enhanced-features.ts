import { BlockManager } from './src/blockManager.js'

async function testEnhancedFeatures() {
  console.log('🚀 Testing Enhanced Block Manager Features...\n')

  const blockManager = new BlockManager()

  try {
    // Initialize the block manager
    await blockManager.initialize()
    console.log('✅ Block manager initialized successfully')

    // Create a new account with initial balance
    console.log('\n📝 Creating new account with 0.5 ETH...')
    const newAccountAddress = await blockManager.createAccount(BigInt(500000000000000000n)) // 0.5 ETH
    console.log(`✅ New account created: ${newAccountAddress}`)

    // Get accounts and display balances
    const accounts = blockManager.getAccounts()
    console.log('\n👥 Current accounts:')
    accounts.forEach((account) => {
      const balanceEth = Number(account.balance) / 1e18
      console.log(`  ${account.address}: ${balanceEth.toFixed(4)} ETH`)
    })

    // Transfer ETH between accounts
    console.log('\n💸 Transferring 0.1 ETH...')
    const defaultAccount = accounts[0].address
    const tx = await blockManager.transferETH(
      defaultAccount,
      newAccountAddress,
      BigInt(100000000000000000n),
    ) // 0.1 ETH

    if (tx.status === 'executed') {
      console.log(`✅ ETH transfer successful! Gas used: ${tx.gasUsed.toString()}`)
    } else {
      console.log(`❌ ETH transfer failed: ${tx.error}`)
    }

    // Display updated accounts
    const updatedAccounts = blockManager.getAccounts()
    console.log('\n👥 Updated accounts:')
    updatedAccounts.forEach((account) => {
      const balanceEth = Number(account.balance) / 1e18
      console.log(`  ${account.address}: ${balanceEth.toFixed(4)} ETH`)
    })

    // Display all logs
    const logs = blockManager.getAllLogs()
    console.log(`\n📋 Event logs (${logs.length}):`)
    logs.forEach((log, index) => {
      console.log(`  Log ${index + 1}:`)
      console.log(`    Address: ${log.address}`)
      console.log(`    Topics: ${log.topics.join(', ')}`)
      console.log(`    Data: ${log.data}`)
    })

    // Display transaction metadata
    const transactions = blockManager.getTransactions()
    console.log(`\n📊 Transactions (${transactions.length}):`)
    transactions.forEach((tx, index) => {
      console.log(`  Transaction ${index + 1}:`)
      console.log(`    Type: ${tx.type}`)
      console.log(`    From: ${tx.from}`)
      console.log(`    To: ${tx.to || 'Contract Creation'}`)
      console.log(`    Value: ${Number(tx.value) / 1e18} ETH`)
      console.log(`    Gas Used: ${tx.gasUsed.toString()}`)
      console.log(`    Status: ${tx.status}`)
      console.log(`    Events: ${tx.metadata.events.length}`)
    })

    // Finalize the block
    const finalBlock = await blockManager.finalizeBlock()
    console.log('\n📦 Finalized block:')
    console.log(`  Block Number: ${finalBlock.blockNumber}`)
    console.log(`  Gas Used: ${finalBlock.gasUsed.toString()}`)
    console.log(`  Transactions: ${finalBlock.transactions.length}`)
    console.log(`  Total Accounts: ${finalBlock.totalAccounts}`)
    console.log(`  State Root: ${finalBlock.stateRoot}`)
    console.log(`  Block Hash: ${finalBlock.blockHash}`)

    console.log('\n🎉 All enhanced features tested successfully!')
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testEnhancedFeatures().catch(console.error)
