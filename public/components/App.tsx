import {
  AccountBalanceWallet as AccountBalanceWalletIcon,
  Code as CodeIcon,
  SwapHoriz as SwapHorizIcon,
  PlayArrow as PlayArrowIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import {
  AppBar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
  Paper,
  Select,
  MenuItem,
  TextField,
  Chip,
  CircularProgress,
} from '@mui/material'
import React, { useState, useEffect } from 'react'
import { BlockManager } from '../../src/blockManager'
import { SolidityExecutor } from '../../src/solidityExecutor'
import { AccountManagement, CodeEditor, TransferModal, TransactionDetailsModal } from './index'
import packageJson from '../../package.json'
import TransactionSliderBar from './TransactionSliderBar';
import { Transaction } from '../../src/blockManager';

const drawerWidth = 240

// Create singleton instances to prevent duplicate creation in React.StrictMode
let globalBlockManager: BlockManager | null = null
let globalExecutor: SolidityExecutor | null = null

const getBlockManager = () => {
  if (!globalBlockManager) {
    globalBlockManager = new BlockManager()
  }
  return globalBlockManager
}

const getExecutor = () => {
  if (!globalExecutor) {
    globalExecutor = new SolidityExecutor(getBlockManager())
  }
  return globalExecutor
}

export default function App() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [activeSection, setActiveSection] = useState('code')
  const blockManager = getBlockManager()
  const executor = getExecutor()
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentBlock, setCurrentBlock] = useState<any>(null);
  const [deployedContracts, setDeployedContracts] = useState<any[]>([]);
  const [returnValueDialog, setReturnValueDialog] = useState<{ open: boolean; value: string; title: string }>({
    open: false,
    value: '',
    title: ''
  });
  const [eventDataDialog, setEventDataDialog] = useState<{ open: boolean; value: string; title: string }>({
    open: false,
    value: '',
    title: ''
  });
  // Contract execution dialog state
  const [selectedContract, setSelectedContract] = useState<any | null>(null);
  const [openContractDialog, setOpenContractDialog] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState<string>('');
  const [functionArgs, setFunctionArgs] = useState<string>('');
  const [executionOutput, setExecutionOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  // Code editor state - lifted up to persist across tab switches
  const [editorCode, setEditorCode] = useState('');

  useEffect(() => {
    const init = async () => {
      // Initialize the block manager
      await blockManager.initialize();
      
      // Set up transaction update callback
      const updateTransactions = () => {
        const txs = blockManager.getTransactions();
        setTransactions(txs);
        updateDeployedContracts(txs);
      };
      
      // Set initial transactions and register callback
      updateTransactions();
      blockManager.onTransactionUpdate(updateTransactions);
      
      // Fallback interval to ensure UI stays in sync
      const interval = setInterval(updateTransactions, 1000);
      
      return () => clearInterval(interval);
    };
    
    const cleanup = init();
    return () => {
      cleanup.then((cleanupFn) => cleanupFn && cleanupFn());
    };
  }, [blockManager]);

  useEffect(() => {
    const updateCurrentBlock = () => {
      setCurrentBlock(blockManager.getCurrentBlock());
    };
    updateCurrentBlock();
    const interval = setInterval(updateCurrentBlock, 1000);
    return () => clearInterval(interval);
  }, [blockManager]);

  // Icon helpers (copied from BlockchainView)
  const getTransactionTypeIcon = (type: string, tx?: Transaction) => {
    switch (type) {
      case 'deployment':
        return '🤝';
      case 'function_call':
        return '▶️';
      case 'contract_call':
        return '🔗';
      case 'eth_transfer':
        return '💸';
      case 'account_creation':
        if (tx && tx.from === '0x0000000000000000000000000000000000000000') {
          return '👑';
        }
        return '👤';
      default:
        return '📄';
    }
  };
  const getTransactionStatusIcon = (status: string) => {
    switch (status) {
      case 'executed':
        return '✅';
      case 'failed':
        return '❌';
      case 'pending':
        return '⏳';
      default:
        return '❓';
    }
  };

  // Detect contract name based on bytecode patterns
  const detectContractName = (tx: Transaction): string | null => {
    if (tx.data) {
      const bytecode = tx.data.toLowerCase();

      // More specific heuristics based on common patterns in the bytecode
      if (bytecode.includes('increment') && bytecode.includes('getcount')) {
        return 'Counter';
      } else if (
        bytecode.includes('add') &&
        bytecode.includes('multiply') &&
        !bytecode.includes('set') &&
        !bytecode.includes('get')
      ) {
        return 'Calculator';
      } else if (
        (bytecode.includes('set') && bytecode.includes('get')) ||
        bytecode.includes('storeddata')
      ) {
        return 'Storage';
      } else if (
        bytecode.includes('hello') ||
        (bytecode.includes('simple') &&
          !bytecode.includes('increment') &&
          !bytecode.includes('add'))
      ) {
        return 'Simple';
      } else if (bytecode.includes('array') || bytecode.includes('addnumber')) {
        return 'ArrayOperations';
      }
    }
    return null;
  };

  // Update deployed contracts from transactions
  const updateDeployedContracts = (transactions: Transaction[]) => {
    const contracts: any[] = [];
    
    transactions.forEach((tx) => {
      if (tx.type === 'deployment' && tx.contractAddress && tx.status === 'executed') {
        let contractName = 'Unknown Contract';
        let abi: any[] = [];

        // Try to get contract info from executor first
        if (executor) {
          const contractInfo = executor.getContractByAddress(tx.contractAddress);
          if (contractInfo) {
            contractName = contractInfo.name;
            abi = contractInfo.abi;
          } else {
            // Fallback to last compiled contract info
            const lastCompiledAbi = (executor as any).lastCompiledAbi;
            const lastCompiledName = (executor as any).lastCompiledName;
            
            if (lastCompiledAbi && lastCompiledName) {
              // Use bytecode detection to determine if this is the right contract
              const detectedName = detectContractName(tx);
              contractName = detectedName || lastCompiledName;
              abi = lastCompiledAbi;
            } else {
              // Final fallback to bytecode detection
              const detectedName = detectContractName(tx);
              contractName = detectedName || `Contract_${tx.contractAddress.slice(0, 8)}`;
            }
          }
        } else {
          // No executor available, use bytecode detection
          const detectedName = detectContractName(tx);
          contractName = detectedName || `Contract_${tx.contractAddress.slice(0, 8)}`;
        }
        
        const contract = {
          address: tx.contractAddress,
          name: contractName,
          deploymentTxId: tx.id,
          abi: abi,
          functions: abi.filter((item: any) => item.type === 'function').map((func: any) => ({
            signature: `${func.name}(${func.inputs.map((input: any) => `${input.type} ${input.name}`).join(', ')}) → ${func.outputs.length > 0 ? func.outputs.map((output: any) => output.type).join(', ') : 'void'}`,
            name: func.name,
            inputs: func.inputs,
            outputs: func.outputs,
            stateMutability: func.stateMutability,
          })),
          deployedAt: tx.timestamp,
        };
        contracts.push(contract);
      }
    });
    
    setDeployedContracts(contracts);
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section)
  }

  const handleCloseTransactionModal = () => {
    setSelectedTx(null);
  };

  const handleContractClick = (contract: any) => {
    // Contract execution is now handled directly in the modal
    // This function is kept for compatibility but no longer navigates
  };

  const handleContractExecute = (contract: any) => {
    setSelectedContract(contract);
    setSelectedFunction('');
    setFunctionArgs('');
    setExecutionOutput('');
    setOpenContractDialog(true);
  };

  const handleReturnValueClick = (value: string, title: string) => {
    setReturnValueDialog({
      open: true,
      value: value,
      title: title
    });
  };

  const handleCloseReturnValueDialog = () => {
    setReturnValueDialog({
      open: false,
      value: '',
      title: ''
    });
  };

  const handleEventDataClick = (data: string, title: string) => {
    setEventDataDialog({
      open: true,
      value: data,
      title: title
    });
  };

  const handleCloseEventDataDialog = () => {
    setEventDataDialog({
      open: false,
      value: '',
      title: ''
    });
  };

  // Contract execution dialog handlers
  const handleCloseContractDialog = () => {
    setOpenContractDialog(false);
  };

  const handleFunctionChange = (event: any) => {
    setSelectedFunction(event.target.value);
  };

  const handleArgsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFunctionArgs(event.target.value);
  };

  const handleExecuteFunction = async () => {
    if (!selectedFunction || !selectedContract) return;
    setIsExecuting(true);
    setExecutionOutput('');

    try {
      const functionInfo = selectedContract.functions.find(
        (f: any) => f.signature === selectedFunction,
      );
      if (!functionInfo) {
        throw new Error('Function not found');
      }

      let args: any[] = [];
      if (functionArgs.trim() && functionArgs.trim() !== '[]') {
        try {
          args = JSON.parse(functionArgs);
          if (!Array.isArray(args)) {
            throw new Error('Arguments must be an array');
          }
        } catch (parseError) {
          throw new Error('Invalid JSON format for arguments');
        }
      }

      // Validate argument count
      if (args.length !== functionInfo.inputs.length) {
        throw new Error(`Expected ${functionInfo.inputs.length} arguments, got ${args.length}`);
      }

      // Use BlockManager's executeContractFunction method
      const result = await blockManager.executeContractFunction(
        selectedContract.address,
        selectedContract.abi,
        functionInfo.name,
        args,
      );

      if (result.status === 'executed') {
        let output = `✅ Function "${functionInfo.name}" executed successfully!\n`;
        output += `📊 Gas used: ${result.gasUsed.toString()}\n`;
        output += `💰 Gas price: ${result.gasPrice.toString()}\n`;

        if (result.returnValue) {
          output += `📤 Return value: ${result.returnValue}\n`;
        }

        if (result.logs && result.logs.length > 0) {
          output += `📋 Event logs:\n`;
          result.logs.forEach((log, index) => {
            output += `  ${index + 1}. Address: ${log.address}\n`;
            output += `     Topics: ${log.topics.join(', ')}\n`;
            output += `     Data: ${log.data}\n`;
          });
        }

        setExecutionOutput(output);
      } else {
        setExecutionOutput(`❌ Function execution failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      setExecutionOutput(
        `❌ Error: ${error.message || 'An error occurred while executing the function'}`,
      );
    } finally {
      setIsExecuting(false);
    }
  };

  const getContractFunctions = (contract: any) => {
    return contract.functions || [];
  };

  const renderFunctionInfo = (functionInfo: any) => {
    if (!functionInfo) return null;

    return (
      <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Function Details:
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
          {functionInfo.signature}
        </Typography>
        {functionInfo.inputs.length > 0 && (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Parameters:
            </Typography>
            {functionInfo.inputs.map((input: any, index: number) => (
              <Typography key={index} variant="body2" sx={{ fontFamily: 'monospace', ml: 2 }}>
                {input.name}: {input.type}
              </Typography>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  const menuItems = [
    { text: 'Code Editor', icon: <span style={{ fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 'bold' }}>{'{'}{'}'}</span>, section: 'code' },
    { text: 'Accounts', icon: <AccountBalanceWalletIcon />, section: 'accounts' },
  ]

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            YZ ETH Blockchain Simulator v{packageJson.version}
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? activeSection !== 'code' : true}
        onClose={() => handleSectionChange('code')}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
                <ListItemButton
                  selected={activeSection === item.section}
                  onClick={() => handleSectionChange(item.section)}
                  sx={{
                    minHeight: 48,
                    justifyContent: isMobile ? 'initial' : 'initial',
                    px: 2.5,
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: isMobile ? 3 : 'auto',
                      justifyContent: 'center',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} sx={{ opacity: isMobile ? 1 : 1 }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider />

          {/* Current Block Info */}
          <Box sx={{ px: 2, py: 1 }}>
            <Paper elevation={2} sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Current Block
              </Typography>
              {currentBlock ? (
                <Box>
                  <Typography variant="body2">
                    <strong>Number:</strong> {currentBlock.blockNumber.toString()}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Gas Used:</strong> {currentBlock.gasUsed.toString()} / {currentBlock.gasLimit.toString()}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Transactions:</strong> {currentBlock.transactions.length}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Timestamp:</strong> {new Date(Number(currentBlock.timestamp) * 1000).toLocaleString()}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No block data available
                </Typography>
              )}
            </Paper>
          </Box>

          {/* YZ Logo */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              py: 4,
              px: 2,
              mt: 2,
            }}
          >
            <img
              src="./yz.png"
              alt="YZ Logo"
              style={{
                width: '120px',
                height: 'auto',
                opacity: 0.3,
                filter: 'grayscale(20%)',
                transition: 'opacity 0.3s ease',
              }}
            />
          </Box>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: '100%', mt: 8, pb: 12 }}>
        {activeSection === 'code' && <CodeEditor executor={executor} blockManager={blockManager} code={editorCode} setCode={setEditorCode} />}
        {activeSection === 'accounts' && <AccountManagement blockManager={blockManager} />}
      </Box>
      <TransactionSliderBar
        transactions={transactions}
        getTransactionTypeIcon={getTransactionTypeIcon}
        getTransactionStatusIcon={getTransactionStatusIcon}
        onTileClick={setSelectedTx}
        selectedTxId={selectedTx?.id}
        deployedContracts={deployedContracts}
        onContractExecute={handleContractExecute}
      />
      
      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        transaction={selectedTx}
        open={!!selectedTx}
        onClose={handleCloseTransactionModal}
        deployedContracts={deployedContracts}
        onContractClick={handleContractClick}
        onReturnValueClick={handleReturnValueClick}
        onEventDataClick={handleEventDataClick}
      />
      
      {/* Return Value Dialog */}
      <Dialog
        open={returnValueDialog.open}
        onClose={handleCloseReturnValueDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{returnValueDialog.title}</DialogTitle>
        <DialogContent>
          <Typography
            variant="body1"
            sx={{
              fontFamily: 'monospace',
              backgroundColor: '#f5f5f5',
              padding: 2,
              borderRadius: 1,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {returnValueDialog.value}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReturnValueDialog}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Event Data Dialog */}
      <Dialog
        open={eventDataDialog.open}
        onClose={handleCloseEventDataDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{eventDataDialog.title}</DialogTitle>
        <DialogContent>
          <Typography
            variant="body1"
            sx={{
              fontFamily: 'monospace',
              backgroundColor: '#f5f5f5',
              padding: 2,
              borderRadius: 1,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {eventDataDialog.value}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEventDataDialog}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Contract Execution Dialog */}
      <Dialog
        open={openContractDialog}
        onClose={handleCloseContractDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '80vh',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>📝</span>
            <Typography variant="h6" component="span">
              Execute Contract Function
            </Typography>
            {selectedContract && (
              <Typography variant="subtitle2" sx={{ ml: 1, opacity: 0.7 }}>
                - {selectedContract.name}
              </Typography>
            )}
          </Box>
          <IconButton onClick={handleCloseContractDialog} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 2 }}>
          {/* Contract Details */}
          <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
              📋 Contract Details
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 1, alignItems: 'start' }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Name:</Typography>
              <Typography variant="body2">{selectedContract?.name || 'Unnamed Contract'}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Address:</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {selectedContract?.address || 'N/A'}
              </Typography>
            </Box>
          </Paper>

          {/* Available Functions */}
          {selectedContract && (
            <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                ⚙️ Available Functions ({selectedContract.functions.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
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
            </Paper>
          )}

          {/* Function Execution */}
          <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
              🔧 Function Execution
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Select
                value={selectedFunction}
                onChange={handleFunctionChange}
                displayEmpty
                fullWidth
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
                  );
                  return renderFunctionInfo(functionInfo);
                })()}

              <TextField
                label="Arguments (JSON array)"
                value={functionArgs}
                onChange={handleArgsChange}
                fullWidth
                multiline
                rows={3}
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
          </Paper>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
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
          <Button onClick={handleCloseContractDialog} variant="contained" color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
