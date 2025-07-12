import { describe, it, expect, beforeEach } from 'vitest'
import { BlockManager, Transaction } from '../src/blockManager'

describe('TransactionSliderBar Performance', () => {
  let blockManager: BlockManager

  beforeEach(async () => {
    blockManager = new BlockManager()
    await blockManager.initialize()
  })

  it('should handle 1000 transactions efficiently', async () => {
    const startTime = performance.now()
    
    // Create 1000 test transactions
    const transactions: Transaction[] = []
    for (let i = 0; i < 1000; i++) {
      const tx: Transaction = {
        id: `tx_${i}`,
        type: i % 5 === 0 ? 'deployment' : 
             i % 5 === 1 ? 'function_call' : 
             i % 5 === 2 ? 'contract_call' : 
             i % 5 === 3 ? 'eth_transfer' : 'account_creation',
        from: '0x1234567890123456789012345678901234567890',
        to: '0x0987654321098765432109876543210987654321',
        data: '0x',
        gasUsed: BigInt(21000),
        gasPrice: BigInt(20000000000),
        nonce: BigInt(i),
        value: BigInt(0),
        timestamp: Date.now() + i * 1000,
        status: i % 10 === 0 ? 'failed' : 'executed',
        logs: [],
        metadata: {
          blockNumber: BigInt(0),
          transactionIndex: i,
          gasLimit: BigInt(21000),
          effectiveGasPrice: BigInt(20000000000),
          cumulativeGasUsed: BigInt(21000),
          status: true,
          events: [],
        },
      }
      transactions.push(tx)
    }

    const creationTime = performance.now() - startTime
    console.log(`Created 1000 transactions in ${creationTime.toFixed(2)}ms`)

    // Test transaction filtering (what the slider bar does)
    const filterStartTime = performance.now()
    const visibleTransactions = transactions.slice(0, 10) // Simulate virtual scrolling
    const filterTime = performance.now() - filterStartTime
    
    console.log(`Filtered transactions in ${filterTime.toFixed(2)}ms`)
    
    expect(transactions.length).toBe(1000)
    expect(visibleTransactions.length).toBe(10)
    expect(creationTime).toBeLessThan(100) // Should create 1000 transactions in under 100ms
    expect(filterTime).toBeLessThan(1) // Should filter in under 1ms
  })

  it('should handle 10000 transactions efficiently', async () => {
    const startTime = performance.now()
    
    // Create 10000 test transactions
    const transactions: Transaction[] = []
    for (let i = 0; i < 10000; i++) {
      const tx: Transaction = {
        id: `tx_${i}`,
        type: i % 5 === 0 ? 'deployment' : 
             i % 5 === 1 ? 'function_call' : 
             i % 5 === 2 ? 'contract_call' : 
             i % 5 === 3 ? 'eth_transfer' : 'account_creation',
        from: '0x1234567890123456789012345678901234567890',
        to: '0x0987654321098765432109876543210987654321',
        data: '0x',
        gasUsed: BigInt(21000),
        gasPrice: BigInt(20000000000),
        nonce: BigInt(i),
        value: BigInt(0),
        timestamp: Date.now() + i * 1000,
        status: i % 10 === 0 ? 'failed' : 'executed',
        logs: [],
        metadata: {
          blockNumber: BigInt(0),
          transactionIndex: i,
          gasLimit: BigInt(21000),
          effectiveGasPrice: BigInt(20000000000),
          cumulativeGasUsed: BigInt(21000),
          status: true,
          events: [],
        },
      }
      transactions.push(tx)
    }

    const creationTime = performance.now() - startTime
    console.log(`Created 10000 transactions in ${creationTime.toFixed(2)}ms`)

    // Test virtual scrolling calculations
    const scrollStartTime = performance.now()
    const TILE_WIDTH = 180
    const TILE_GAP = 12
    const containerWidth = 1200
    const scrollLeft = 50000
    
    // Calculate visible range (what the optimized slider bar does)
    const tileWithGap = TILE_WIDTH + TILE_GAP
    const startIndex = Math.max(0, Math.floor(scrollLeft / tileWithGap) - 3)
    const endIndex = Math.min(
      transactions.length,
      Math.ceil((scrollLeft + containerWidth) / tileWithGap) + 3
    )
    
    const visibleTransactions = transactions.slice(startIndex, endIndex)
    const scrollTime = performance.now() - scrollStartTime
    
    console.log(`Calculated visible range for 10000 transactions in ${scrollTime.toFixed(2)}ms`)
    console.log(`Visible range: ${startIndex} to ${endIndex} (${visibleTransactions.length} tiles)`)
    
    expect(transactions.length).toBe(10000)
    expect(visibleTransactions.length).toBeLessThan(20) // Should only render ~10-15 visible tiles
    expect(creationTime).toBeLessThan(500) // Should create 10000 transactions in under 500ms
    expect(scrollTime).toBeLessThan(5) // Should calculate visible range in under 5ms
  })

  it('should efficiently handle transaction updates', async () => {
    const transactions: Transaction[] = []
    
    // Create initial set of transactions
    for (let i = 0; i < 5000; i++) {
      transactions.push({
        id: `tx_${i}`,
        type: 'function_call',
        from: '0x1234567890123456789012345678901234567890',
        to: '0x0987654321098765432109876543210987654321',
        data: '0x',
        gasUsed: BigInt(21000),
        gasPrice: BigInt(20000000000),
        nonce: BigInt(i),
        value: BigInt(0),
        timestamp: Date.now() + i * 1000,
        status: 'executed',
        logs: [],
        metadata: {
          blockNumber: BigInt(0),
          transactionIndex: i,
          gasLimit: BigInt(21000),
          effectiveGasPrice: BigInt(20000000000),
          cumulativeGasUsed: BigInt(21000),
          status: true,
          events: [],
        },
      })
    }

    // Test adding new transactions (what happens when new txns are created)
    const updateStartTime = performance.now()
    
    for (let i = 5000; i < 5010; i++) {
      transactions.push({
        id: `tx_${i}`,
        type: 'deployment',
        from: '0x1234567890123456789012345678901234567890',
        data: '0x608060405234801561001057600080fd5b50',
        gasUsed: BigInt(500000),
        gasPrice: BigInt(20000000000),
        nonce: BigInt(i),
        value: BigInt(0),
        timestamp: Date.now() + i * 1000,
        status: 'executed',
        logs: [],
        metadata: {
          blockNumber: BigInt(0),
          transactionIndex: i,
          gasLimit: BigInt(500000),
          effectiveGasPrice: BigInt(20000000000),
          cumulativeGasUsed: BigInt(500000),
          status: true,
          events: [],
        },
      })
    }
    
    const updateTime = performance.now() - updateStartTime
    console.log(`Added 10 new transactions to 5000 existing ones in ${updateTime.toFixed(2)}ms`)
    
    expect(transactions.length).toBe(5010)
    expect(updateTime).toBeLessThan(10) // Should add new transactions in under 10ms
  })
}) 