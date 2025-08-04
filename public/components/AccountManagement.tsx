import { Add as AddIcon, Refresh as RefreshIcon, SwapHoriz as SwapHorizIcon } from '@mui/icons-material'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import React, { useState, useEffect } from 'react'
import { BlockManager } from '../../src/blockManager'
import { TransferModal } from './index'
import { useMultisynq } from '../../src/components/YZProvider'
import { formatAddress } from '../../src/utils/formatters'

interface AccountManagementProps {
  blockManager: BlockManager
}

export default function AccountManagement({ blockManager }: AccountManagementProps) {
  const { blockchainState, publish } = useMultisynq()
  const [accounts, setAccounts] = useState<any[]>([])
  const [openDialog, setOpenDialog] = useState(false)
  const [newAccountBalance, setNewAccountBalance] = useState('1000000000000000000')
  const [transferModalOpen, setTransferModalOpen] = useState(false)

  useEffect(() => {
    // Get accounts from Multisynq blockchain state instead of BlockManager
    if (blockchainState?.accounts) {
      setAccounts(blockchainState.accounts)
    }
  }, [blockchainState])

  const updateAccounts = () => {
    // Accounts are now automatically updated via Multisynq state
    // This function is kept for compatibility but no longer needed
  }

  const handleOpenDialog = () => {
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setNewAccountBalance('0')
  }

  const handleCreateAccount = async () => {
    try {
      const balance = newAccountBalance
      
      // Publish account creation request through Multisynq
      const accountData = {
        balance: balance,
        type: 'account_creation'
      }
      
      console.log("AccountManagement: Publishing account creation through Multisynq:", accountData)
      publish('blockchain', 'createAccount', accountData)
      
      handleCloseDialog()
    } catch (error: any) {
      console.error('Error creating account:', error)
      alert('Failed to create account: ' + error.message)
    }
  }

  const handleRefresh = () => {
    updateAccounts()
  }

  const handleOpenTransferModal = () => {
    setTransferModalOpen(true)
  }

  const handleCloseTransferModal = () => {
    setTransferModalOpen(false)
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Account Management
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
          sx={{ mr: 1 }}
        >
          Create Account
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          sx={{ mr: 1 }}
        >
          Refresh
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SwapHorizIcon />}
          onClick={handleOpenTransferModal}
        >
          Transfer
        </Button>
      </Box>
      <Paper elevation={1} sx={{ p: 3, minHeight: '300px', maxHeight: '500px', overflowY: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          Accounts
        </Typography>
        {accounts.length > 0 ? (
          <List>
            {accounts.map((account, index) => (
              <React.Fragment key={index}>
                <ListItem>
                  <ListItemText
                    primary={`Address: ${formatAddress(account.address)}`}
                    secondary={`Balance: ${account.balance?.toString() || '0'} wei${account.nonce !== undefined ? ` | Nonce: ${account.nonce}` : ''}${account.isContract !== undefined ? ` | ${account.isContract ? 'Contract' : 'EOA'}` : ''}`}
                  />
                </ListItem>
                {index < accounts.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Typography>No accounts found.</Typography>
        )}
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Create New Account</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Initial Balance (wei)"
            type="number"
            fullWidth
            value={newAccountBalance}
            onChange={(e) => setNewAccountBalance(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="secondary">
            Cancel
          </Button>
          <Button
            onClick={handleCreateAccount}
            color="primary"
            disabled={newAccountBalance === '' || BigInt(newAccountBalance) < 0}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
      <TransferModal
        open={transferModalOpen}
        onClose={handleCloseTransferModal}
        blockManager={blockManager}
      />
    </Box>
  )
}
