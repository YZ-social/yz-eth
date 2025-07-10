import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material'
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

interface AccountManagementProps {
  blockManager: BlockManager
}

export default function AccountManagement({ blockManager }: AccountManagementProps) {
  const [accounts, setAccounts] = useState<any[]>([])
  const [openDialog, setOpenDialog] = useState(false)
  const [newAccountBalance, setNewAccountBalance] = useState('1000000000000000000')

  useEffect(() => {
    updateAccounts()
    const interval = setInterval(updateAccounts, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [blockManager])

  const updateAccounts = () => {
    const accountList = blockManager.getAccounts()
    setAccounts(accountList)
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
      const balance = BigInt(newAccountBalance)
      await blockManager.createAccount(balance)
      updateAccounts()
      handleCloseDialog()
    } catch (error: any) {
      console.error('Error creating account:', error)
      alert('Failed to create account: ' + error.message)
    }
  }

  const handleRefresh = () => {
    updateAccounts()
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
        >
          Refresh
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
                    primary={`Address: ${account.address}`}
                    secondary={`Balance: ${account.balance.toString()} wei | Nonce: ${account.nonce.toString()} | ${account.isContract ? 'Contract' : 'EOA'}`}
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
    </Box>
  )
}
