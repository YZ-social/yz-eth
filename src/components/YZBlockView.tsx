import React from 'react';
import { Paper, Typography, List, ListItem, ListItemText, Box, Chip, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useMultisynq } from './YZProvider';

export const MultisynqBlockView: React.FC = () => {
  const { blockchainState } = useMultisynq();

  const formatHash = (hash: string) => {
    if (!hash) return 'N/A';
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  const getBlockColor = (blockNumber: number) => {
    if (blockNumber === 0) return '#2196f3'; // Blue for genesis
    return '#4caf50'; // Green for regular blocks
  };

  if (!blockchainState) {
    return (
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          🧱 Blockchain Blocks
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Waiting for blockchain state...
        </Typography>
      </Paper>
    );
  }

  const blocks = blockchainState.blocks || [];

  return (
    <Paper elevation={3} sx={{ p: 2, mb: 2, maxHeight: '500px', overflow: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        🧱 Blockchain Blocks ({blocks.length})
      </Typography>
      
      {blocks.length === 0 ? (
        <Typography variant="body2" color="textSecondary">
          No blocks found. The blockchain will start with a genesis block.
        </Typography>
      ) : (
        <Box>
          {blocks.map((block, index) => {
            const isGenesis = block.number === 0;
            const transactionCount = block.transactions ? block.transactions.length : 0;
            
            return (
              <Accordion 
                key={block.number || index}
                sx={{ 
                  mb: 1,
                  '&:before': { display: 'none' },
                  boxShadow: 1
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    bgcolor: isGenesis ? '#e3f2fd' : '#f1f8e9',
                    borderLeft: `4px solid ${getBlockColor(block.number)}`,
                    '&:hover': {
                      bgcolor: isGenesis ? '#bbdefb' : '#dcedc8'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', width: '100%' }}>
                    <Chip
                      label={isGenesis ? '🌱 Genesis' : `Block #${block.number}`}
                      size="small"
                      sx={{ 
                        bgcolor: getBlockColor(block.number),
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    />
                    <Chip
                      label={`${transactionCount} TX`}
                      size="small"
                      color={transactionCount > 0 ? 'secondary' : 'default'}
                      variant="outlined"
                    />
                    <Typography variant="body2" component="span" sx={{ fontFamily: 'monospace' }}>
                      {formatHash(block.hash)}
                    </Typography>
                    <Typography variant="caption" component="span" sx={{ color: 'text.secondary', ml: 'auto' }}>
                      {formatTimestamp(block.timestamp)}
                    </Typography>
                  </Box>
                </AccordionSummary>
                
                <AccordionDetails sx={{ bgcolor: '#fafafa' }}>
                  <Box>
                    {/* Block Details */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        📊 Block Details
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1 }}>
                        <Typography variant="body2">
                          <strong>Number:</strong> {block.number}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Timestamp:</strong> {formatTimestamp(block.timestamp)}
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          <strong>Hash:</strong> {block.hash || 'N/A'}
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          <strong>Parent:</strong> {formatHash(block.parentHash)}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Transactions in Block */}
                    {transactionCount > 0 ? (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                          💼 Transactions ({transactionCount})
                        </Typography>
                        <List dense>
                          {block.transactions.map((tx: any, txIndex: number) => (
                            <ListItem
                              key={tx.hash || tx.id || txIndex}
                              sx={{
                                border: '1px solid #e0e0e0',
                                borderRadius: 1,
                                mb: 1,
                                bgcolor: 'white',
                                borderLeft: `3px solid ${
                                  tx.status === 'executed' || tx.status === 'success' ? '#4caf50' :
                                  tx.status === 'failed' || tx.status === 'error' ? '#f44336' : '#ff9800'
                                }`
                              }}
                            >
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                    <Chip
                                      label={tx.type || 'transaction'}
                                      size="small"
                                      color={
                                        tx.type === 'deployment' ? 'primary' :
                                        tx.type === 'function_call' ? 'secondary' : 'default'
                                      }
                                      variant="filled"
                                    />
                                    <Typography variant="body2" component="span">
                                      {tx.hash ? formatHash(tx.hash) : (tx.id || `TX #${txIndex + 1}`)}
                                    </Typography>
                                  </Box>
                                }
                                secondary={
                                  <Box component="div">
                                    {tx.contractAddress && (
                                      <Typography variant="body2" component="div">
                                        📄 Contract: {formatHash(tx.contractAddress)}
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
                                  </Box>
                                }
                                primaryTypographyProps={{ component: 'div' }}
                                secondaryTypographyProps={{ component: 'div' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        📭 No transactions in this block
                      </Typography>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}
      
      {/* Summary Footer */}
      <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid #e0e0e0' }}>
        <Typography variant="caption" color="textSecondary">
          🧱 Total Blocks: {blocks.length} | 
          💳 Accounts: {blockchainState.accounts.length} | 
          📋 Contracts: {blockchainState.contracts.length} |
          ⏳ Pending: {blockchainState.pendingTransactions.length} |
          💓 Heartbeat: {blockchainState.heartbeatCount}
        </Typography>
      </Box>
    </Paper>
  );
}; 