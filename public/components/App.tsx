import {
  AccountBalanceWallet as AccountBalanceWalletIcon,
  Code as CodeIcon,
  Dashboard as DashboardIcon,
  SwapHoriz as SwapHorizIcon,
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
} from '@mui/material'
import React, { useState, useEffect } from 'react'
import { BlockManager } from '../../src/blockManager'
import { SolidityExecutor } from '../../src/solidityExecutor'
import { AccountManagement, BlockchainView, CodeEditor, TransferModal, TransactionDetailsModal } from './index'
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
  const [activeSection, setActiveSection] = useState('dashboard')
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

  // Update deployed contracts from transactions
  const updateDeployedContracts = (transactions: Transaction[]) => {
    const contracts: any[] = [];
    
    transactions.forEach((tx) => {
      if (tx.type === 'deployment' && tx.contractAddress && tx.status === 'executed') {
        // Simple contract detection - can be enhanced later
        const contract = {
          address: tx.contractAddress,
          name: `Contract_${tx.contractAddress.slice(0, 8)}`,
          deploymentTxId: tx.id,
          abi: [],
          functions: [],
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
    // Navigate to dashboard and trigger contract execution
    setActiveSection('dashboard');
    // The BlockchainView component will handle the contract execution
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

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, section: 'dashboard' },
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
        open={isMobile ? activeSection !== 'dashboard' : true}
        onClose={() => handleSectionChange('dashboard')}
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
              src="/yz.png"
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
        {activeSection === 'dashboard' && (
          <BlockchainView blockManager={blockManager} executor={executor} />
        )}
        {activeSection === 'code' && <CodeEditor executor={executor} blockManager={blockManager} />}
        {activeSection === 'accounts' && <AccountManagement blockManager={blockManager} />}
      </Box>
      <TransactionSliderBar
        transactions={transactions}
        getTransactionTypeIcon={getTransactionTypeIcon}
        getTransactionStatusIcon={getTransactionStatusIcon}
        onTileClick={setSelectedTx}
        selectedTxId={selectedTx?.id}
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
    </Box>
  )
}
