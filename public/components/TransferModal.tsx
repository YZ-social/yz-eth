import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import React, { useState, useEffect } from 'react'
import { BlockManager } from '../../src/blockManager'

interface TransferModalProps {
  open: boolean
  onClose: () => void
  blockManager: BlockManager
}

export default function TransferModal({ open, onClose, blockManager }: TransferModalProps) {
  const [fromAddress, setFromAddress] = useState('')
  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [accounts, setAccounts] = useState<any[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      const accountList = blockManager.getAccounts()
      setAccounts(accountList)
      setFromAddress('')
      setToAddress('')
      setAmount('')
      setError('')
    }
  }, [open, blockManager])

  const handleTransfer = async () => {
    if (!fromAddress || !toAddress || !amount) {
      setError('All fields are required')
      return
    }

    try {
      const transferAmount = BigInt(amount)
      if (transferAmount <= 0) {
        setError('Amount must be greater than 0')
        return
      }

      await blockManager.transferETH(fromAddress, toAddress, transferAmount)
      onClose()
    } catch (error: any) {
      console.error('Error transferring ETH:', error)
      setError(error.message || 'Failed to transfer ETH')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Transfer ETH</DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="dense">
          <InputLabel>From Address</InputLabel>
          <Select
            value={fromAddress}
            onChange={(e) => setFromAddress(e.target.value as string)}
            label="From Address"
          >
            {accounts.map((account) => (
              <MenuItem key={account.address} value={account.address}>
                {account.address} (Balance: {account.balance.toString()} wei)
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth margin="dense">
          <InputLabel>To Address</InputLabel>
          <Select
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value as string)}
            label="To Address"
          >
            {accounts.map((account) => (
              <MenuItem key={account.address} value={account.address}>
                {account.address} (Balance: {account.balance.toString()} wei)
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          fullWidth
          margin="dense"
          label="Amount (wei)"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {error && (
          <Typography color="error" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button
          onClick={handleTransfer}
          color="primary"
          disabled={!fromAddress || !toAddress || !amount || BigInt(amount || '0') <= 0}
        >
          Transfer
        </Button>
      </DialogActions>
    </Dialog>
  )
}
