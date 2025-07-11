import {
  Code as CodeIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import React, { useState, useEffect } from 'react'
import { BlockManager, LogEntry, Transaction } from '../../src/blockManager'
import { SolidityExecutor } from '../../src/solidityExecutor'
import { formatEther } from 'ethers'

interface BlockchainViewProps {
  blockManager: BlockManager
  executor?: SolidityExecutor
}

interface DeployedContract {
  address: string
  name: string
  deploymentTxId: string
  abi: any[]
  functions: any[]
  deployedAt: number
}

// Track logged contracts globally to avoid re-logging on component remount
const loggedContracts = new Set<string>()
let lastLoggedContractsCount = 0

// Store contract ABIs by address to avoid the "last compiled" issue
const contractAbiMap = new Map<string, { abi: any[]; name: string }>()

// Store the deployment order to track which contract was deployed when
const deploymentOrder: { txId: string; contractName: string; abi: any[] }[] = []

export default function BlockchainView({ blockManager, executor }: BlockchainViewProps) {
  const [currentBlock, setCurrentBlock] = useState<any>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [deployedContracts, setDeployedContracts] = useState<DeployedContract[]>([])
  const [selectedContract, setSelectedContract] = useState<DeployedContract | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedFunction, setSelectedFunction] = useState<string>('')
  const [functionArgs, setFunctionArgs] = useState<string>('')
  const [executionOutput, setExecutionOutput] = useState<string>('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [returnValueDialog, setReturnValueDialog] = useState<{ open: boolean; value: string; title: string }>({
    open: false,
    value: '',
    title: ''
  })
  const [eventDataDialog, setEventDataDialog] = useState<{ open: boolean; value: string; title: string }>({
    open: false,
    value: '',
    title: ''
  })

  useEffect(() => {
    const updateBlockchainData = () => {
      try {
        // Get current block data
        const block = blockManager.getCurrentBlock()
        setCurrentBlock(block)

        // Get all transactions
        const txs = blockManager.getTransactions()
        setTransactions(txs)

        // Get all logs
        const allLogs = blockManager.getAllLogs()
        setLogs(allLogs)

        // Update deployed contracts list
        updateDeployedContracts(txs)
      } catch (error) {
        console.error('Error updating blockchain data:', error)
      }
    }

    updateBlockchainData()
    const interval = setInterval(updateBlockchainData, 1000)
    return () => {
      clearInterval(interval)
    }
  }, [blockManager])

  const updateDeployedContracts = (transactions: Transaction[]) => {
    const contracts: DeployedContract[] = []

    transactions.forEach((tx) => {
      if (tx.type === 'deployment' && tx.contractAddress && tx.status === 'executed') {
        // Check if this contract has already been logged globally
        const isNewContract = !loggedContracts.has(tx.contractAddress)

        if (isNewContract) {
          console.log('🏗️ Found NEW deployment transaction:', tx)
          loggedContracts.add(tx.contractAddress)
        }

        // Try to get real ABI from stored mapping or executor
        let abi: any[] = []
        let contractName = 'Unknown Contract'

        // First, check if we already have the ABI stored for this contract
        const storedContract = contractAbiMap.get(tx.contractAddress)
        if (storedContract) {
          abi = storedContract.abi
          contractName = storedContract.name
          if (isNewContract) {
            console.log('✅ Using stored ABI for contract:', {
              address: tx.contractAddress,
              name: contractName,
              functions: abi.length,
            })
          }
        } else if (executor && isNewContract) {
          // Try to get contract info by address from executor first
          console.log('🔍 Attempting address lookup for:', tx.contractAddress)
          console.log('🔍 All stored contracts in executor:', executor.getAllStoredContracts())
          const contractInfo = executor.getContractByAddress(tx.contractAddress)
          console.log('🔍 Address lookup result:', contractInfo)

          if (contractInfo) {
            // Use the contract info from executor's address-based lookup
            abi = contractInfo.abi
            contractName = contractInfo.name

            // Store this ABI for future use
            contractAbiMap.set(tx.contractAddress, { abi, name: contractName })

            console.log('✅ Using contract info from executor address lookup:', {
              name: contractName,
              functions: abi.length,
              address: tx.contractAddress,
            })
          } else {
            // Fallback to last compiled (old behavior)
            try {
              const lastCompiledAbi = (executor as any).lastCompiledAbi
              const lastCompiledName = (executor as any).lastCompiledName

              // For new deployments, we need to determine the correct contract name
              // The issue is that lastCompiledName always contains the most recently compiled contract
              // So we need to detect the actual contract type from the transaction data
              const detectedName = detectContractName(tx)
              const actualContractName = detectedName || lastCompiledName || 'Deployed Contract'

              console.log('Executor ABI check (fallback):', {
                hasAbi: !!lastCompiledAbi,
                abiLength: lastCompiledAbi?.length,
                lastCompiledName: lastCompiledName,
                detectedName: detectedName,
                actualContractName: actualContractName,
                contractAddress: tx.contractAddress,
              })

              if (lastCompiledAbi && Array.isArray(lastCompiledAbi) && lastCompiledAbi.length > 0) {
                abi = lastCompiledAbi
                contractName = actualContractName

                // Store this ABI for future use
                contractAbiMap.set(tx.contractAddress, { abi, name: contractName })

                console.log('✅ Using real ABI from executor fallback and storing it:', {
                  name: contractName,
                  functions: abi.length,
                })
              } else {
                // Fallback to detecting from transaction data
                abi = getSmartContractAbi(tx)
                contractName = detectedName || `Contract_${tx.contractAddress.slice(0, 8)}`

                // Store the fallback ABI too
                contractAbiMap.set(tx.contractAddress, { abi, name: contractName })

                console.log('⚠️ Using detected ABI (fallback) and storing it:', {
                  name: contractName,
                  functions: abi.length,
                })
              }
            } catch (error) {
              console.warn('❌ Failed to get real ABI, using fallback:', error)
              abi = getSmartContractAbi(tx)
              contractName = detectContractName(tx) || `Contract_${tx.contractAddress.slice(0, 8)}`

              // Store the fallback ABI
              contractAbiMap.set(tx.contractAddress, { abi, name: contractName })
            }
          }
        } else {
          // For existing contracts or when no executor, use fallback detection
          abi = getSmartContractAbi(tx)
          contractName = detectContractName(tx) || `Contract_${tx.contractAddress.slice(0, 8)}`

          // Store the detected ABI if not already stored
          if (!contractAbiMap.has(tx.contractAddress)) {
            contractAbiMap.set(tx.contractAddress, { abi, name: contractName })
          }
        }

        const contract: DeployedContract = {
          address: tx.contractAddress,
          name: contractName,
          deploymentTxId: tx.id,
          abi: abi,
          functions: abi
            .filter((item: any) => item.type === 'function')
            .map((func: any) => {
              const inputs = func.inputs
                .map((input: any) => `${input.type} ${input.name}`)
                .join(', ')
              const outputs =
                func.outputs.length > 0
                  ? func.outputs.map((output: any) => output.type).join(', ')
                  : 'void'
              return {
                signature: `${func.name}(${inputs}) → ${outputs}`,
                name: func.name,
                inputs: func.inputs,
                outputs: func.outputs,
                stateMutability: func.stateMutability,
              }
            }),
          deployedAt: tx.timestamp,
        }

        if (isNewContract) {
          console.log('📋 Created contract object:', contract)
        }
        contracts.push(contract)
      }
    })

    // Only log when we have new contracts (global count increase)
    const hasNewContracts = contracts.length > lastLoggedContractsCount
    if (hasNewContracts) {
      console.log('📦 Final contracts array:', contracts)
      lastLoggedContractsCount = contracts.length
    }
    setDeployedContracts(contracts)
  }

  const detectContractName = (tx: Transaction): string | null => {
    // Detect contract name based on bytecode patterns
    if (tx.data) {
      const bytecode = tx.data.toLowerCase()

      // Debug: Log bytecode patterns for analysis
      console.log('🔍 Bytecode analysis for contract:', {
        contractAddress: tx.contractAddress,
        bytecodeLength: bytecode.length,
        hasIncrement: bytecode.includes('increment'),
        hasGetCount: bytecode.includes('getcount'),
        hasAdd: bytecode.includes('add'),
        hasMultiply: bytecode.includes('multiply'),
        hasSet: bytecode.includes('set'),
        hasGet: bytecode.includes('get'),
        hasHello: bytecode.includes('hello'),
        hasSimple: bytecode.includes('simple'),
        hasStoredData: bytecode.includes('storeddata'),
        bytecodePreview: bytecode.substring(0, 200) + '...',
      })

      // More specific heuristics based on common patterns in the bytecode
      // Order matters: more specific patterns first
      if (bytecode.includes('increment') && bytecode.includes('getcount')) {
        console.log('✅ Detected as Counter')
        return 'Counter'
      } else if (
        bytecode.includes('add') &&
        bytecode.includes('multiply') &&
        !bytecode.includes('set') &&
        !bytecode.includes('get')
      ) {
        console.log('✅ Detected as Calculator')
        return 'Calculator'
      } else if (
        (bytecode.includes('set') && bytecode.includes('get')) ||
        bytecode.includes('storeddata')
      ) {
        console.log('✅ Detected as Storage')
        return 'Storage'
      } else if (
        bytecode.includes('hello') ||
        (bytecode.includes('simple') &&
          !bytecode.includes('increment') &&
          !bytecode.includes('add'))
      ) {
        console.log('✅ Detected as Simple')
        return 'Simple'
      } else if (bytecode.includes('array') || bytecode.includes('addnumber')) {
        console.log('✅ Detected as ArrayOperations')
        return 'ArrayOperations'
      }

      console.log('❌ No pattern matched - returning null')
    }

    return null
  }

  const handleContractClick = (contract: DeployedContract) => {
    console.log('Contract clicked:', contract)
    setSelectedContract(contract)
    setSelectedFunction('')
    setFunctionArgs('')
    setExecutionOutput('')
    setOpenDialog(true)
    console.log('Dialog should be opening, openDialog state:', true)
  }

  const handleContractSelect = (transaction: Transaction) => {
    console.log('Transaction selected for contract interaction:', transaction)
    if (transaction.type === 'deployment' && transaction.contractAddress) {
      const contract = deployedContracts.find((c) => c.address === transaction.contractAddress)
      console.log('Found contract:', contract)
      if (contract) {
        handleContractClick(contract)
      }
    }
  }

  // Smart contract ABI detection based on contract type
  const getSmartContractAbi = (tx: Transaction): any[] => {
    const contractName = detectContractName(tx)

    // Return appropriate ABI based on detected contract type
    switch (contractName) {
      case 'Simple':
        return [
          {
            type: 'function',
            name: 'main',
            inputs: [],
            outputs: [{ type: 'string', name: '' }],
            stateMutability: 'pure',
          },
        ]

      case 'Counter':
        return [
          {
            type: 'function',
            name: 'increment',
            inputs: [],
            outputs: [],
            stateMutability: 'nonpayable',
          },
          {
            type: 'function',
            name: 'getCount',
            inputs: [],
            outputs: [{ type: 'uint256', name: '' }],
            stateMutability: 'view',
          },
          {
            type: 'function',
            name: 'main',
            inputs: [],
            outputs: [],
            stateMutability: 'nonpayable',
          },
        ]

      case 'Calculator':
        return [
          {
            type: 'function',
            name: 'add',
            inputs: [
              { type: 'uint256', name: 'a' },
              { type: 'uint256', name: 'b' },
            ],
            outputs: [{ type: 'uint256', name: '' }],
            stateMutability: 'pure',
          },
          {
            type: 'function',
            name: 'multiply',
            inputs: [
              { type: 'uint256', name: 'a' },
              { type: 'uint256', name: 'b' },
            ],
            outputs: [{ type: 'uint256', name: '' }],
            stateMutability: 'pure',
          },
          {
            type: 'function',
            name: 'main',
            inputs: [],
            outputs: [{ type: 'uint256', name: '' }],
            stateMutability: 'pure',
          },
        ]

      case 'Storage':
        return [
          {
            type: 'function',
            name: 'set',
            inputs: [{ type: 'uint256', name: 'x' }],
            outputs: [],
            stateMutability: 'nonpayable',
          },
          {
            type: 'function',
            name: 'get',
            inputs: [],
            outputs: [{ type: 'uint256', name: '' }],
            stateMutability: 'view',
          },
          {
            type: 'function',
            name: 'main',
            inputs: [],
            outputs: [],
            stateMutability: 'nonpayable',
          },
        ]

      case 'ArrayOperations':
        return [
          {
            type: 'function',
            name: 'addNumber',
            inputs: [{ type: 'uint256', name: 'num' }],
            outputs: [],
            stateMutability: 'nonpayable',
          },
          {
            type: 'function',
            name: 'getNumbers',
            inputs: [],
            outputs: [{ type: 'uint256[]', name: '' }],
            stateMutability: 'view',
          },
          {
            type: 'function',
            name: 'sum',
            inputs: [],
            outputs: [{ type: 'uint256', name: '' }],
            stateMutability: 'view',
          },
          {
            type: 'function',
            name: 'main',
            inputs: [],
            outputs: [],
            stateMutability: 'nonpayable',
          },
        ]

      default:
        // Generic ABI for unknown contracts
        return [
          {
            type: 'function',
            name: 'main',
            inputs: [],
            outputs: [],
            stateMutability: 'nonpayable',
          },
        ]
    }
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
  }

  const handleReturnValueClick = (value: string, title: string) => {
    setReturnValueDialog({
      open: true,
      value: value,
      title: title
    })
  }

  const handleCloseReturnValueDialog = () => {
    setReturnValueDialog({
      open: false,
      value: '',
      title: ''
    })
  }

  const handleEventDataClick = (data: string, title: string) => {
    setEventDataDialog({
      open: true,
      value: data,
      title: title
    })
  }

  const handleCloseEventDataDialog = () => {
    setEventDataDialog({
      open: false,
      value: '',
      title: ''
    })
  }

  const handleFunctionChange = (event: any) => {
    const selectedValue = event.target.value
    setSelectedFunction(selectedValue)

    // Update function arguments placeholder based on selected function
    if (selectedContract && selectedValue) {
      const functionInfo = selectedContract.functions.find(
        (f: any) => f.signature === selectedValue,
      )
      if (functionInfo && functionInfo.inputs.length > 0) {
        const exampleArgs = functionInfo.inputs.map((input: any) => {
          switch (input.type) {
            case 'uint256':
              return '0'
            case 'int256':
              return '0'
            case 'address':
              return '"0x1234567890123456789012345678901234567890"'
            case 'string':
              return '"example"'
            case 'bool':
              return 'true'
            case 'bytes':
              return '"0x"'
            default:
              return 'null'
          }
        })
        setFunctionArgs(`[${exampleArgs.join(', ')}]`)
      } else {
        setFunctionArgs('[]')
      }
    }
  }

  const handleArgsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFunctionArgs(event.target.value)
  }

  const handleExecuteFunction = async () => {
    if (!selectedFunction || !selectedContract) return
    setIsExecuting(true)
    setExecutionOutput('')

    try {
      const functionInfo = selectedContract.functions.find(
        (f: any) => f.signature === selectedFunction,
      )
      if (!functionInfo) {
        throw new Error('Function not found')
      }

      let args: any[] = []
      if (functionArgs.trim() && functionArgs.trim() !== '[]') {
        try {
          args = JSON.parse(functionArgs)
          if (!Array.isArray(args)) {
            throw new Error('Arguments must be an array')
          }
        } catch (parseError) {
          throw new Error('Invalid JSON format for arguments')
        }
      }

      // Validate argument count
      if (args.length !== functionInfo.inputs.length) {
        throw new Error(`Expected ${functionInfo.inputs.length} arguments, got ${args.length}`)
      }

      // Use BlockManager's executeContractFunction method
      const result = await blockManager.executeContractFunction(
        selectedContract.address,
        selectedContract.abi,
        functionInfo.name,
        args,
      )

      if (result.status === 'executed') {
        let output = `✅ Function "${functionInfo.name}" executed successfully!\n`
        output += `📊 Gas used: ${result.gasUsed.toString()}\n`
        output += `💰 Gas price: ${result.gasPrice.toString()}\n`

        if (result.returnValue) {
          output += `📤 Return value: ${result.returnValue}\n`
        }

        if (result.logs && result.logs.length > 0) {
          output += `📋 Event logs:\n`
          result.logs.forEach((log, index) => {
            output += `  ${index + 1}. Address: ${log.address}\n`
            output += `     Topics: ${log.topics.join(', ')}\n`
            output += `     Data: ${log.data}\n`
          })
        }

        setExecutionOutput(output)
      } else {
        setExecutionOutput(`❌ Function execution failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      setExecutionOutput(
        `❌ Error: ${error.message || 'An error occurred while executing the function'}`,
      )
    } finally {
      setIsExecuting(false)
    }
  }

  const renderTransactionStatus = (status: string) => {
    switch (status) {
      case 'executed':
        return '✅'
      case 'failed':
        return '❌'
      case 'pending':
        return '⏳'
      default:
        return '❓'
    }
  }

  const renderTransactionType = (type: string, tx?: Transaction) => {
    switch (type) {
      case 'deployment':
        return '🤝'
      case 'function_call':
        return '▶️'
      case 'contract_call':
        return '🔗'
      case 'eth_transfer':
        return '💸'
      case 'account_creation':
        if (tx && tx.from === '0x0000000000000000000000000000000000000000') {
          return '👑'
        }
        return '👤'
      default:
        return '📄'
    }
  }

  const getContractFunctions = (contract: DeployedContract) => {
    return contract.functions || []
  }

  const renderFunctionInfo = (functionInfo: any) => {
    if (!functionInfo) return null

    return (
      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom component="div">
          Function Details:
        </Typography>
        <Typography variant="body2" component="div">
          <strong>Name:</strong> {functionInfo.name}
        </Typography>
        <Typography variant="body2" component="div">
          <strong>State Mutability:</strong> {functionInfo.stateMutability}
        </Typography>
        {functionInfo.inputs.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" component="div">
              <strong>Parameters:</strong>
            </Typography>
            {functionInfo.inputs.map((input: any, index: number) => (
              <Typography key={index} variant="body2" sx={{ ml: 2 }} component="div">
                {index + 1}. {input.type} {input.name}
              </Typography>
            ))}
          </Box>
        )}
        {functionInfo.outputs.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" component="div">
              <strong>Returns:</strong>
            </Typography>
            {functionInfo.outputs.map((output: any, index: number) => (
              <Typography key={index} variant="body2" sx={{ ml: 2 }} component="div">
                {index + 1}. {output.type} {output.name || '(unnamed)'}
              </Typography>
            ))}
          </Box>
        )}
      </Box>
    )
  }

  const truncateEventData = (data: string, maxLength: number = 50) => {
    if (data.length <= maxLength) return data
    return data.substring(0, maxLength) + '...'
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Blockchain Dashboard
      </Typography>

      {/* Current Block Info */}
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          📦 Current Block
        </Typography>
        {currentBlock ? (
          <Box>
            <Typography variant="body2">
              <strong>Number:</strong> {currentBlock.blockNumber.toString()}
            </Typography>
            <Typography variant="body2">
              <strong>Gas Used:</strong> {currentBlock.gasUsed.toString()} /{' '}
              {currentBlock.gasLimit.toString()}
            </Typography>
            <Typography variant="body2">
              <strong>Transactions:</strong> {currentBlock.transactions.length}
            </Typography>
            <Typography variant="body2">
              <strong>Timestamp:</strong>{' '}
              {new Date(Number(currentBlock.timestamp) * 1000).toLocaleString()}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="textSecondary">
            No block data available
          </Typography>
        )}
      </Paper>

      {/* Transactions */}
      <Paper elevation={3} sx={{ p: 2, mb: 2, maxHeight: '600px', overflow: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          📋 Transactions & Contracts ({transactions.length})
        </Typography>
        {transactions.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No transactions available. Execute some Solidity code to see transactions.
          </Typography>
        ) : (
          <List>
            {transactions.map((tx, index) => {
              // Find if this transaction deployed a contract we know about
              const deployedContract = deployedContracts.find(c => c.deploymentTxId === tx.id)
              
              // Find the contract that was called for function calls
              const calledContract = tx.type === 'function_call' && tx.to 
                ? deployedContracts.find(c => c.address.toLowerCase() === tx.to!.toLowerCase())
                : null
              
              return (
                <ListItem
                  key={tx.id}
                  sx={{
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    mb: 1,
                    borderLeft: `4px solid ${tx.status === 'executed' ? '#4caf50' : tx.status === 'failed' ? '#f44336' : '#ff9800'}`,
                    backgroundColor: tx.type === 'deployment' && deployedContract ? '#f8f9fa' : 'transparent',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    gap: { xs: 1, sm: 0 },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <span>{renderTransactionType(tx.type, tx)}</span>
                        <span>{renderTransactionStatus(tx.status)}</span>
                        <Typography variant="body2" component="span" sx={{ fontWeight: 'bold' }}>
                          {tx.id} - {(() => {
                            if (tx.type === 'function_call' && calledContract && tx.functionName) {
                              return `${calledContract.name} - ${tx.functionName}()`
                            } else if (tx.type === 'function_call' && tx.functionName) {
                              return `Contract - ${tx.functionName}()`
                            } else if (tx.type === 'contract_call' && tx.functionName) {
                              return `Contract Call - ${tx.functionName}()`
                            } else if (tx.type === 'account_creation') {
                              if (tx.from === '0x0000000000000000000000000000000000000000') {
                                return `Genesis Account - ${tx.to?.slice(0, 8)}...`
                              } else {
                                return `Account Creation - ${tx.to?.slice(0, 8)}...`
                              }
                            } else if (tx.type === 'eth_transfer') {
                              return `ETH Transfer - ${formatEther(tx.value)} ETH`
                            } else {
                              return tx.type.replace('_', ' ')
                            }
                          })()}
                        </Typography>
                        {deployedContract && (
                          <Chip
                            label={deployedContract.name}
                            size="small"
                            color="primary"
                            icon={<span>📝</span>}
                            sx={{ ml: 1 }}
                          />
                        )}
                        {tx.type === 'deployment' && tx.contractAddress && (
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<PlayArrowIcon />}
                            onClick={() => {
                              if (deployedContract) {
                                handleContractClick(deployedContract)
                              } else {
                                // Fallback for contracts without full details
                                const fallbackContract: DeployedContract = {
                                  address: tx.contractAddress!,
                                  name: `Contract_${tx.contractAddress!.slice(0, 8)}`,
                                  deploymentTxId: tx.id,
                                  abi: getSmartContractAbi(tx),
                                  functions: getSmartContractAbi(tx)
                                    .filter((item: any) => item.type === 'function')
                                    .map((func: any) => {
                                      const inputs = func.inputs
                                        .map((input: any) => `${input.type} ${input.name}`)
                                        .join(', ')
                                      const outputs =
                                        func.outputs.length > 0
                                          ? func.outputs.map((output: any) => output.type).join(', ')
                                          : 'void'
                                      return {
                                        signature: `${func.name}(${inputs}) → ${outputs}`,
                                        name: func.name,
                                        inputs: func.inputs,
                                        outputs: func.outputs,
                                        stateMutability: func.stateMutability,
                                      }
                                    }),
                                  deployedAt: tx.timestamp,
                                }
                                handleContractClick(fallbackContract)
                              }
                            }}
                            sx={{
                              backgroundColor: '#B05823',
                              '&:hover': {
                                backgroundColor: '#8B4513',
                              },
                              fontWeight: 'bold',
                              minWidth: '80px',
                              whiteSpace: 'nowrap',
                              ml: 1,
                            }}
                          >
                            Execute
                          </Button>
                        )}
                      </Box>
                    }
                    secondary={
                      <Box component="div" sx={{ width: '100%', maxWidth: '100%' }}>
                        <Typography variant="body2" component="div">
                          Gas Used: {tx.gasUsed.toString()}
                        </Typography>
                        {tx.contractAddress && (
                          <Typography 
                            variant="body2" 
                            component="div"
                            sx={{ 
                              wordBreak: 'break-all',
                              fontFamily: 'monospace',
                              fontSize: '0.8rem'
                            }}
                          >
                            Contract: {tx.contractAddress}
                          </Typography>
                        )}
                        {tx.type === 'account_creation' && (
                          <Box sx={{ mt: 1, p: 1, bgcolor: tx.from === '0x0000000000000000000000000000000000000000' ? 'purple.50' : 'blue.50', borderRadius: 1 }}>
                            <Typography variant="body2" component="div" sx={{ fontWeight: 'bold', color: tx.from === '0x0000000000000000000000000000000000000000' ? 'purple.700' : 'blue.700' }}>
                              {tx.from === '0x0000000000000000000000000000000000000000' ? '👑 Genesis Account:' : '👤 Account Created:'}
                            </Typography>
                            <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                              Address: {tx.to}
                            </Typography>
                            <Typography variant="body2" component="div">
                              Initial Balance: {formatEther(tx.value)} ETH
                            </Typography>
                            {tx.from === '0x0000000000000000000000000000000000000000' && (
                              <Typography variant="body2" component="div" sx={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                                This is the default account created during blockchain initialization
                              </Typography>
                            )}
                          </Box>
                        )}
                        {tx.type === 'eth_transfer' && (
                          <Box sx={{ mt: 1, p: 1, bgcolor: 'green.50', borderRadius: 1 }}>
                            <Typography variant="body2" component="div" sx={{ fontWeight: 'bold', color: 'green.700' }}>
                              💸 ETH Transfer:
                            </Typography>
                            <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                              From: {tx.from}
                            </Typography>
                            <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                              To: {tx.to}
                            </Typography>
                            <Typography variant="body2" component="div" sx={{ fontWeight: 'bold' }}>
                              Amount: {formatEther(tx.value)} ETH
                            </Typography>
                          </Box>
                        )}
                        {tx.type === 'contract_call' && (
                          <Box sx={{ mt: 1, p: 1, bgcolor: 'orange.50', borderRadius: 1 }}>
                            <Typography variant="body2" component="div" sx={{ fontWeight: 'bold', color: 'orange.700' }}>
                              🔗 Contract-to-Contract Call:
                            </Typography>
                            <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                              From Contract: {tx.from}
                            </Typography>
                            <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                              To Contract: {tx.to}
                            </Typography>
                            <Typography variant="body2" component="div">
                              Function: {tx.functionName}
                            </Typography>
                            {tx.functionArgs && tx.functionArgs.length > 0 && (
                              <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                Args: {JSON.stringify(tx.functionArgs)}
                              </Typography>
                            )}
                            {tx.value > 0 && (
                              <Typography variant="body2" component="div">
                                Value Sent: {formatEther(tx.value)} ETH
                              </Typography>
                            )}
                          </Box>
                        )}
                        {deployedContract && (
                          <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="body2" component="div" sx={{ fontWeight: 'bold' }}>
                              📋 Contract Details:
                            </Typography>
                            <Typography variant="body2" component="div">
                              Name: {deployedContract.name}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              component="div"
                              sx={{ 
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              Functions: {deployedContract.functions.map((f) => f.name).join(', ')}
                            </Typography>
                            <Typography variant="body2" component="div">
                              Deployed: {new Date(deployedContract.deployedAt).toLocaleString()}
                            </Typography>
                          </Box>
                        )}
                        {tx.functionName && (
                          <Typography variant="body2" component="div">
                            Function: {tx.functionName}
                          </Typography>
                        )}
                        {tx.functionArgs && tx.functionArgs.length > 0 && (
                          <Typography 
                            variant="body2" 
                            component="div"
                            sx={{ 
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontFamily: 'monospace',
                              fontSize: '0.8rem'
                            }}
                          >
                            Args: {JSON.stringify(tx.functionArgs)}
                          </Typography>
                        )}
                        {tx.returnValue && (
                          <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="body2" component="div" sx={{ fontWeight: 'bold' }}>
                              📤 Return Value:
                            </Typography>
                            <Typography 
                              variant="body2" 
                              component="div"
                              onClick={() => {
                                const processedValue = (() => {
                                  try {
                                    const parsed = JSON.parse(tx.returnValue || '')
                                    if (typeof parsed === 'string') {
                                      return parsed
                                    } else if (Array.isArray(parsed) && parsed.length === 1 && typeof parsed[0] === 'string') {
                                      return parsed[0]
                                    } else {
                                      return JSON.stringify(parsed, null, 2)
                                    }
                                  } catch {
                                    if (tx.returnValue && tx.returnValue.startsWith('"') && tx.returnValue.endsWith('"')) {
                                      return tx.returnValue.slice(1, -1)
                                    }
                                    return tx.returnValue || ''
                                  }
                                })()
                                handleReturnValueClick(processedValue, `Return Value - ${tx.functionName || 'Contract Execution'}`)
                              }}
                              sx={{ 
                                fontFamily: 'monospace',
                                fontSize: '0.9rem',
                                color: '#2e7d32',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                maxWidth: { xs: '150px', sm: '200px', md: '250px' },
                                '&:hover': {
                                  textDecoration: 'underline',
                                  color: '#1b5e20'
                                }
                              }}
                            >
                              {(() => {
                                try {
                                  // Try to parse as JSON first
                                  const parsed = JSON.parse(tx.returnValue || '')
                                  if (typeof parsed === 'string') {
                                    return parsed
                                  } else if (Array.isArray(parsed) && parsed.length === 1 && typeof parsed[0] === 'string') {
                                    return parsed[0]
                                  } else {
                                    return JSON.stringify(parsed, null, 2)
                                  }
                                } catch {
                                  // If not JSON, check if it's a quoted string
                                  if (tx.returnValue && tx.returnValue.startsWith('"') && tx.returnValue.endsWith('"')) {
                                    return tx.returnValue.slice(1, -1)
                                  }
                                  // Otherwise return as-is
                                  return tx.returnValue || ''
                                }
                              })()}
                            </Typography>
                          </Box>
                        )}
                        {tx.error && (
                          <Box sx={{ mt: 1, p: 1, bgcolor: 'red.50', borderRadius: 1 }}>
                            <Typography variant="body2" component="div" sx={{ fontWeight: 'bold', color: 'red.700' }}>
                              ❌ Transaction Failed:
                            </Typography>
                            <Typography variant="body2" component="div" color="error">
                              {tx.error}
                            </Typography>
                            {tx.errorDetails && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="body2" component="div" sx={{ fontWeight: 'bold' }}>
                                  Error Details:
                                </Typography>
                                <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                  Reason: {tx.errorDetails.reason}
                                </Typography>
                                <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                  Gas Used: {tx.errorDetails.gasUsed.toString()}
                                </Typography>
                                {tx.errorDetails.opcode && (
                                  <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                    Opcode: {tx.errorDetails.opcode}
                                  </Typography>
                                )}
                                {tx.errorDetails.revertData && (
                                  <Typography 
                                    variant="body2" 
                                    component="div" 
                                    sx={{ 
                                      fontFamily: 'monospace', 
                                      fontSize: '0.7rem',
                                      backgroundColor: 'grey.100',
                                      padding: '4px',
                                      borderRadius: '2px',
                                      maxHeight: '100px',
                                      overflow: 'auto'
                                    }}
                                  >
                                    Revert Data: {tx.errorDetails.revertData}
                                  </Typography>
                                )}
                              </Box>
                            )}
                          </Box>
                        )}
                      </Box>
                    }
                    primaryTypographyProps={{ component: 'div' }}
                    secondaryTypographyProps={{ component: 'div' }}
                    sx={{ 
                      flex: 1,
                      minWidth: 0,
                      mr: { xs: 0, sm: 2 }
                    }}
                  />
                </ListItem>
              )
            })}
          </List>
        )}
      </Paper>

      {/* Event Logs */}
      <Paper elevation={3} sx={{ p: 2, maxHeight: '300px', overflow: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          📋 Event Logs ({logs.length})
        </Typography>
        {logs.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No event logs available.
          </Typography>
        ) : (
          <List>
            {logs.map((log, index) => (
              <ListItem key={index} sx={{ border: '1px solid #e0e0e0', borderRadius: 1, mb: 1 }}>
                <ListItemText
                  primary={`Log #${index}`}
                  secondary={
                    <Box component="div">
                      <Typography variant="body2" component="div">
                        Address: {log.address}
                      </Typography>
                      <Typography variant="body2" component="div">
                        Topics: {log.topics.join(', ')}
                      </Typography>
                      <Typography variant="body2" component="div">
                        Data: 
                        <span
                          onClick={() => handleEventDataClick(log.data, `Event Log #${index} Data`)}
                          style={{
                            fontFamily: 'monospace',
                            backgroundColor: '#f0f0f0',
                            padding: '2px 4px',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            color: '#1976d2',
                            marginLeft: '4px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#e3f2fd'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#f0f0f0'
                          }}
                        >
                          {truncateEventData(log.data)}
                        </span>
                      </Typography>
                      <Typography variant="body2" component="div">
                        Block: {log.blockNumber.toString()}
                      </Typography>
                    </Box>
                  }
                  primaryTypographyProps={{ component: 'div' }}
                  secondaryTypographyProps={{ component: 'div' }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#f5f5f5',
            border: '2px solid #B05823',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          },
        }}
      >
        <DialogTitle>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              backgroundColor: '#B05823',
              color: 'white',
              p: 2,
              m: -2,
              mb: 2,
            }}
          >
            <span>📝</span>
            Execute Contract Function
            {selectedContract && (
              <Typography variant="subtitle2" sx={{ ml: 'auto', opacity: 0.9 }}>
                {selectedContract.name}
              </Typography>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" gutterBottom>
            Contract: {selectedContract?.name || 'Unnamed Contract'}
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontFamily: 'monospace', mb: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}
          >
            Address: {selectedContract?.address || 'N/A'}
          </Typography>

          {selectedContract && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Available Functions: {selectedContract.functions.length}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {selectedContract.functions.slice(0, 5).map((func: any) => (
                  <Chip
                    key={func.name}
                    label={func.name}
                    size="small"
                    variant="outlined"
                    color={func.stateMutability === 'view' ? 'info' : 'primary'}
                  />
                ))}
                {selectedContract.functions.length > 5 && (
                  <Chip
                    label={`+${selectedContract.functions.length - 5} more`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mt: 2 }}>
            <Select
              value={selectedFunction}
              onChange={handleFunctionChange}
              displayEmpty
              fullWidth
              sx={{ mb: 2 }}
            >
              <MenuItem value="" disabled>
                Select a function...
              </MenuItem>
              {selectedContract &&
                getContractFunctions(selectedContract).map((func: any) => (
                  <MenuItem key={func.signature} value={func.signature}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={func.stateMutability}
                        size="small"
                        color={func.stateMutability === 'view' ? 'info' : 'primary'}
                        sx={{ minWidth: '60px' }}
                      />
                      {func.signature}
                    </Box>
                  </MenuItem>
                ))}
            </Select>

            {selectedFunction &&
              selectedContract &&
              (() => {
                const functionInfo = selectedContract.functions.find(
                  (f: any) => f.signature === selectedFunction,
                )
                return renderFunctionInfo(functionInfo)
              })()}

            <TextField
              label="Arguments (JSON array)"
              value={functionArgs}
              onChange={handleArgsChange}
              fullWidth
              multiline
              rows={3}
              sx={{ mb: 2 }}
              disabled={!selectedFunction}
              placeholder={
                selectedFunction
                  ? 'Enter arguments as JSON array, e.g., [123, "hello", true]'
                  : 'Select a function first'
              }
              helperText={
                selectedFunction
                  ? 'Enter arguments as a JSON array. Use quotes for strings and addresses.'
                  : ''
              }
            />
            <Paper
              elevation={2}
              sx={{ p: 2, minHeight: '150px', overflow: 'auto', bgcolor: '#1e1e1e', color: '#fff' }}
            >
              <Typography variant="subtitle2" sx={{ color: '#4caf50', mb: 1 }}>
                Execution Output:
              </Typography>
              {isExecuting ? (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100px',
                  }}
                >
                  <CircularProgress size={24} sx={{ color: '#4caf50' }} />
                  <Typography variant="body2" sx={{ ml: 2, color: '#4caf50' }}>
                    Executing function...
                  </Typography>
                </Box>
              ) : (
                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    lineHeight: 1.4,
                    color: executionOutput.includes('❌') ? '#f44336' : '#fff',
                  }}
                >
                  {executionOutput ||
                    'No output yet. Select a function and click "Execute" to see results.'}
                </Typography>
              )}
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
          <Button
            onClick={handleExecuteFunction}
            variant="contained"
            disabled={!selectedFunction || isExecuting}
            startIcon={<PlayArrowIcon />}
            sx={{
              bgcolor: '#4caf50',
              '&:hover': { bgcolor: '#45a049' },
              '&:disabled': { bgcolor: '#ccc' },
            }}
          >
            {isExecuting ? 'Executing...' : 'Execute Function'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Return Value Dialog */}
      <Dialog
        open={returnValueDialog.open}
        onClose={handleCloseReturnValueDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#f5f5f5',
            border: '2px solid #2e7d32',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          },
        }}
      >
        <DialogTitle>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              backgroundColor: '#2e7d32',
              color: 'white',
              p: 2,
              m: -2,
              mb: 2,
            }}
          >
            <Typography variant="h6">
              📤 {returnValueDialog.title}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Paper
            elevation={2}
            sx={{ 
              p: 2, 
              minHeight: '200px', 
              maxHeight: '400px',
              overflow: 'auto', 
              bgcolor: '#1e1e1e', 
              color: '#4caf50',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {returnValueDialog.value}
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReturnValueDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Event Data Dialog */}
      <Dialog
        open={eventDataDialog.open}
        onClose={handleCloseEventDataDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#f5f5f5',
            border: '2px solid #1976d2',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          },
        }}
      >
        <DialogTitle>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              backgroundColor: '#1976d2',
              color: 'white',
              p: 2,
              m: -2,
              mb: 2,
            }}
          >
            <Typography variant="h6">
              📋 {eventDataDialog.title}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Paper
            elevation={2}
            sx={{ 
              p: 2, 
              minHeight: '200px', 
              maxHeight: '400px',
              overflow: 'auto', 
              bgcolor: '#1e1e1e', 
              color: '#2196f3',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {eventDataDialog.value}
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEventDataDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
