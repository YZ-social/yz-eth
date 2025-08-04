import React from 'react';
import { Paper, Typography, List, ListItem, ListItemText, Box, Chip } from '@mui/material';
import { useMultisynq } from './YZProvider';

export const MultisynqTransactionView: React.FC = () => {
  const { blockchainState } = useMultisynq();

  // Extract all transactions from all blocks
  const getAllTransactions = () => {
    if (!blockchainState?.blocks) return [];
    
    const allTransactions: any[] = [];
    blockchainState.blocks.forEach((block, blockIndex) => {
      if (block.transactions && block.transactions.length > 0) {
        block.transactions.forEach((tx: any) => {
          allTransactions.push({
            ...tx,
            blockNumber: block.number,
            blockIndex: blockIndex
          });
        });
      }
    });
    
    return allTransactions.reverse(); // Show newest first
  };

  const allTransactions = getAllTransactions();

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'deployment':
        return 'primary';
      case 'function_call':
        return 'secondary';
      case 'contract_execution':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'executed':
      case 'success':
        return '#4caf50';
      case 'failed':
      case 'error':
        return '#f44336';
      case 'pending':
        return '#ff9800';
      default:
        return '#757575';
    }
  };

  if (!blockchainState) {
    return (
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          📋 Blockchain Transactions
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Waiting for blockchain state...
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 2, mb: 2, maxHeight: '400px', overflow: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        📋 Blockchain Transactions ({allTransactions.length})
      </Typography>
      
      {allTransactions.length === 0 ? (
        <Typography variant="body2" color="textSecondary">
          No transactions found. Deploy a contract or execute some code to see transactions.
        </Typography>
      ) : (
        <List dense>
          {allTransactions.map((tx, index) => (
            <ListItem
              key={`${tx.blockNumber}-${tx.hash || tx.id || index}`}
              sx={{
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                mb: 1,
                borderLeft: `4px solid ${getStatusColor(tx.status)}`,
                backgroundColor: index % 2 === 0 ? '#fafafa' : 'transparent',
              }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={tx.type || 'transaction'}
                      size="small"
                      color={getTransactionTypeColor(tx.type)}
                      variant="filled"
                    />
                    <Chip
                      label={tx.status || 'unknown'}
                      size="small"
                      sx={{ 
                        bgcolor: getStatusColor(tx.status),
                        color: 'white'
                      }}
                    />
                    <Typography variant="body2" component="span">
                      Block #{tx.blockNumber}
                    </Typography>
                    {tx.hash && (
                      <Typography variant="caption" component="span" sx={{ fontFamily: 'monospace' }}>
                        {tx.hash.slice(0, 10)}...
                      </Typography>
                    )}
                  </Box>
                }
                secondary={
                  <Box component="div">
                    {tx.contractAddress && (
                      <Typography variant="body2" component="div">
                        📄 Contract: {tx.contractAddress.slice(0, 20)}...
                      </Typography>
                    )}
                    {tx.functionName && (
                      <Typography variant="body2" component="div">
                        🔧 Function: {tx.functionName}
                      </Typography>
                    )}
                    {tx.gasUsed && (
                      <Typography variant="body2" component="div">
                        ⛽ Gas: {tx.gasUsed.toString()}
                      </Typography>
                    )}
                    {tx.returnValue && (
                      <Typography variant="body2" component="div" sx={{ color: 'green' }}>
                        ↩️ Return: {tx.returnValue}
                      </Typography>
                    )}
                    {tx.error && (
                      <Typography variant="body2" color="error" component="div">
                        ❌ Error: {tx.error}
                      </Typography>
                    )}
                    {tx.timestamp && (
                      <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
                        🕒 {new Date(tx.timestamp).toLocaleString()}
                      </Typography>
                    )}
                  </Box>
                }
                primaryTypographyProps={{ component: 'div' }}
                secondaryTypographyProps={{ component: 'div' }}
              />
            </ListItem>
          ))}
        </List>
      )}
      
      <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid #e0e0e0' }}>
        <Typography variant="caption" color="textSecondary">
          📊 Total Blocks: {blockchainState.blocks.length} | 
          💳 Accounts: {blockchainState.accounts.length} | 
          📋 Contracts: {blockchainState.contracts.length} |
          ⏳ Pending: {blockchainState.pendingTransactions.length}
        </Typography>
      </Box>
    </Paper>
  );
}; 