import React from 'react';
import { Paper, Typography, Box, Chip, CircularProgress, Button } from '@mui/material';
import { useMultisynq } from './YZProvider';
import { formatHash } from '../utils/formatters';

const YZStatus: React.FC = () => {
  const { isLoading, isConnected, error, blockchainState, publish } = useMultisynq();
  
  // Debug: Log pending transactions count
  React.useEffect(() => {
    if (blockchainState) {
      console.log("MultisynqStatus: Pending transactions count:", blockchainState.pendingTransactions.length);
    }
  }, [blockchainState?.pendingTransactions.length]);

  if (isLoading) {
    return (
      <Paper elevation={2} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
        <Box display="flex" alignItems="center" gap={2}>
          <CircularProgress size={20} />
          <Typography variant="body2">
            Connecting to Multisynq session...
          </Typography>
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper elevation={2} sx={{ p: 2, mb: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
        <Typography variant="body2" fontWeight="bold">
          ❌ Multisynq Error: {error}
        </Typography>
      </Paper>
    );
  }

  if (!isConnected || !blockchainState) {
    return (
      <Paper elevation={2} sx={{ p: 2, mb: 2, bgcolor: 'warning.light' }}>
        <Typography variant="body2">
          ⚠️ Multisynq disconnected - attempting to reconnect...
        </Typography>
      </Paper>
    );
  }

  // Get latest block gas used/limit
  let gasUsedLabel = 'Gas Used: N/A';
  if (blockchainState.blocks.length > 0) {
    const latestBlock = blockchainState.blocks[blockchainState.blocks.length - 1];
    if (latestBlock && latestBlock.gasUsed !== undefined && latestBlock.gasLimit !== undefined) {
      gasUsedLabel = `Gas Used: ${latestBlock.gasUsed.toString()} / ${latestBlock.gasLimit.toString()}`;
    }
  }

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
      {/* First row: Status and stats */}
      <Box display="flex" alignItems="center" gap={2} flexWrap="wrap" mb={0.5}>
        <Typography variant="body2" fontWeight="bold">
          🟢 YZ-ETH Multisynq Session Active
        </Typography>
        <Chip
          label={`💓 ${blockchainState.heartbeatCount}`}
          size="small"
          variant="filled"
          sx={{ bgcolor: 'success.main', color: 'success.contrastText', fontWeight: 'bold' }}
        />
      </Box>
      <Box display="flex" alignItems="center" gap={2} flexWrap="wrap" mb={1}>
        <Chip
          label={`Blocks: ${blockchainState.blocks.length}`}
          size="small"
          variant="filled"
          sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}
        />
        <Chip
          label={`Accounts: ${blockchainState.accounts.length}`}
          size="small"
          variant="filled"
          sx={{ bgcolor: 'secondary.main', color: 'secondary.contrastText' }}
        />
        <Chip
          label={`Contracts: ${blockchainState.contracts.length}`}
          size="small"
          variant="filled"
          sx={{ bgcolor: 'info.main', color: 'info.contrastText' }}
        />
        <Chip
          label={`Pending: ${blockchainState.pendingTransactions.length}`}
          size="small"
          variant="filled"
          sx={{ 
            bgcolor: blockchainState.pendingTransactions.length > 0 ? 'warning.main' : 'grey.400', 
            color: blockchainState.pendingTransactions.length > 0 ? 'warning.contrastText' : 'grey.600'
          }}
        />
        <Chip
          label={gasUsedLabel}
          size="small"
          variant="filled"
          sx={{ bgcolor: 'grey.700', color: 'white' }}
        />
      </Box>
      
      {/* Second row: Block info and Mine button */}
      <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
        <Typography variant="caption" color="inherit">
          Block #{blockchainState.currentBlockNumber} | Hash: {blockchainState.blocks.length > 0 ? formatHash(blockchainState.blocks[blockchainState.blocks.length - 1]?.hash) : 'N/A'}
        </Typography>
        
        {/* Mine Block Button - always show but disable when no pending transactions */}
        <Button
          variant="contained"
          size="small"
          disabled={blockchainState.pendingTransactions.length === 0}
          onClick={() => {
            console.log("MultisynqStatus: Mining block manually...");
            publish('blockchain', 'createBlock', {});
          }}
          sx={{ 
            bgcolor: blockchainState.pendingTransactions.length > 0 ? 'warning.main' : 'grey.400', 
            color: blockchainState.pendingTransactions.length > 0 ? 'warning.contrastText' : 'grey.600',
            '&:hover': { 
              bgcolor: blockchainState.pendingTransactions.length > 0 ? 'warning.dark' : 'grey.500' 
            },
            fontWeight: 'bold',
            minWidth: 120 // Ensure button doesn't get too small
          }}
        >
          ⛏️ Mine Block {blockchainState.pendingTransactions.length > 0 ? `(${blockchainState.pendingTransactions.length})` : '(0)'}
        </Button>
      </Box>
    </Paper>
  );
};
export default YZStatus; 