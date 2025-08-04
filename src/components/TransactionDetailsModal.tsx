import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Transaction } from '../../src/blockManager';
import { formatEther } from 'ethers';
import { formatHash, formatAddress, formatId } from '../../src/utils/formatters';

interface DeployedContract {
  address: string;
  name: string;
  deploymentTxId: string;
  abi: any[];
  functions: Array<{
    signature: string;
    name: string;
    inputs: any[];
    outputs: any[];
    stateMutability: string;
  }>;
  deployedAt: number;
}

interface TransactionDetailsModalProps {
  transaction: Transaction | null;
  open: boolean;
  onClose: () => void;
  deployedContracts: DeployedContract[];
  onContractClick?: (contract: DeployedContract) => void;
  onReturnValueClick?: (value: string, title: string) => void;
  onEventDataClick?: (data: string, title: string) => void;
}

export default function TransactionDetailsModal({
  transaction,
  open,
  onClose,
  deployedContracts,
  onContractClick,
  onReturnValueClick,
  onEventDataClick,
}: TransactionDetailsModalProps) {
  const [copySuccess, setCopySuccess] = useState<string>('');

  if (!transaction) return null;

  // Find if this transaction deployed a contract we know about
  const deployedContract = deployedContracts.find(c => c.deploymentTxId === transaction.id);
  
  // Find the contract that was called for function calls
  const calledContract = transaction.type === 'function_call' && transaction.to 
    ? deployedContracts.find(c => c.address.toLowerCase() === transaction.to!.toLowerCase())
    : null;

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

  const getTransactionTitle = () => {
    if (transaction.type === 'function_call' && calledContract && transaction.functionName) {
      return `${calledContract.name} - ${transaction.functionName}()`;
    } else if (transaction.type === 'function_call' && transaction.functionName) {
      return `Contract - ${transaction.functionName}()`;
    } else if (transaction.type === 'contract_call' && transaction.functionName) {
      return `Contract Call - ${transaction.functionName}()`;
    } else if (transaction.type === 'account_creation') {
      if (transaction.from === '0x0000000000000000000000000000000000000000') {
        return `Genesis Account - ${transaction.to?.slice(0, 8)}...`;
      } else {
        return `Account Creation - ${transaction.to?.slice(0, 8)}...`;
      }
    } else if (transaction.type === 'eth_transfer') {
      return `ETH Transfer - ${formatEther(transaction.value)} ETH`;
    } else {
      return transaction.type.replace('_', ' ');
    }
  };

  const handleContractClick = (contract: DeployedContract) => {
    if (onContractClick) {
      onContractClick(contract);
    }
  };

  const handleReturnValueClick = (value: string, title: string) => {
    if (onReturnValueClick) {
      onReturnValueClick(value, title);
    }
  };

  const handleEventDataClick = (data: string, title: string) => {
    if (onEventDataClick) {
      onEventDataClick(data, title);
    }
  };

  const processReturnValue = (returnValue: string) => {
    try {
      const parsed = JSON.parse(returnValue || '');
      if (typeof parsed === 'string') {
        return parsed;
      } else if (Array.isArray(parsed) && parsed.length === 1 && typeof parsed[0] === 'string') {
        return parsed[0];
      } else {
        return JSON.stringify(parsed, null, 2);
      }
    } catch {
      if (returnValue && returnValue.startsWith('"') && returnValue.endsWith('"')) {
        return returnValue.slice(1, -1);
      }
      return returnValue || '';
    }
  };

  const truncateEventData = (data: string) => {
    if (data.length > 20) {
      return data.substring(0, 20) + '...';
    }
    return data;
  };

  const truncateReturnValue = (value: string, maxLength: number = 100) => {
    if (value.length > maxLength) {
      return value.substring(0, maxLength) + '...';
    }
    return value;
  };

  const handleCopyReturnValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopySuccess('Copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setCopySuccess('Copy failed');
      setTimeout(() => setCopySuccess(''), 2000);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
          <span>{getTransactionTypeIcon(transaction.type, transaction)}</span>
          <span>{getTransactionStatusIcon(transaction.status)}</span>
          <Typography variant="h6" component="span">
            {getTransactionTitle()}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ px: 3, py: 2 }}>
        {/* Transaction ID and Basic Info */}
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
            📋 Transaction Details
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 1, alignItems: 'start' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>ID:</Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {formatId(transaction.id)}
            </Typography>
            
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Status:</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getTransactionStatusIcon(transaction.status)}
              <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                {transaction.status}
              </Typography>
            </Box>
            
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Gas Used:</Typography>
            <Typography variant="body2">{transaction.gasUsed.toString()}</Typography>
            
            {transaction.gasPrice && (
              <>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Gas Price:</Typography>
                <Typography variant="body2">{transaction.gasPrice.toString()}</Typography>
              </>
            )}
            
            {transaction.timestamp && (
              <>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Timestamp:</Typography>
                <Typography variant="body2">
                  {new Date(transaction.timestamp).toLocaleString()}
                </Typography>
              </>
            )}
            
            {transaction.from && (
              <>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>From:</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {formatAddress(transaction.from)}
                </Typography>
              </>
            )}
            
            {transaction.to && (
              <>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>To:</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {formatAddress(transaction.to)}
                </Typography>
              </>
            )}
            
            {transaction.value > 0 && (
              <>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Value:</Typography>
                <Typography variant="body2">{formatEther(transaction.value)} ETH</Typography>
              </>
            )}
          </Box>
        </Paper>

        {/* Contract Address for deployments */}
        {transaction.contractAddress && (
          <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
              📝 Contract Address
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {formatAddress(transaction.contractAddress)}
            </Typography>
          </Paper>
        )}

        {/* Account Creation Details */}
        {transaction.type === 'account_creation' && (
          <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: transaction.from === '0x0000000000000000000000000000000000000000' ? 'purple.50' : 'blue.50' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: transaction.from === '0x0000000000000000000000000000000000000000' ? 'purple.700' : 'blue.700' }}>
              {transaction.from === '0x0000000000000000000000000000000000000000' ? '👑 Genesis Account' : '👤 Account Created'}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 1, alignItems: 'start' }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Address:</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {formatAddress(transaction.to)}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Initial Balance:</Typography>
              <Typography variant="body2">{formatEther(transaction.value)} ETH</Typography>
            </Box>
            {transaction.from === '0x0000000000000000000000000000000000000000' && (
              <Typography variant="body2" sx={{ fontSize: '0.8rem', fontStyle: 'italic', mt: 1 }}>
                This is the default account created during blockchain initialization
              </Typography>
            )}
          </Paper>
        )}

        {/* ETH Transfer Details */}
        {transaction.type === 'eth_transfer' && (
          <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'green.50' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'green.700' }}>
              💸 ETH Transfer
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 1, alignItems: 'start' }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>From:</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {formatAddress(transaction.from)}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>To:</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {formatAddress(transaction.to)}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Amount:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {formatEther(transaction.value)} ETH
              </Typography>
            </Box>
          </Paper>
        )}

        {/* Contract Call Details */}
        {transaction.type === 'contract_call' && (
          <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'orange.50' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'orange.700' }}>
              🔗 Contract-to-Contract Call
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 1, alignItems: 'start' }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>From Contract:</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {formatAddress(transaction.from)}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>To Contract:</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {formatAddress(transaction.to)}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Function:</Typography>
              <Typography variant="body2">{transaction.functionName}</Typography>
              {transaction.functionArgs && transaction.functionArgs.length > 0 && (
                <>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Arguments:</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {JSON.stringify(transaction.functionArgs)}
                  </Typography>
                </>
              )}
              {transaction.value > 0 && (
                <>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Value Sent:</Typography>
                  <Typography variant="body2">{formatEther(transaction.value)} ETH</Typography>
                </>
              )}
            </Box>
          </Paper>
        )}

        {/* Function Details */}
        {transaction.functionName && (
          <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
              ⚙️ Function Details
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 1, alignItems: 'start' }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Function:</Typography>
              <Typography variant="body2">{transaction.functionName}</Typography>
              {transaction.functionArgs && transaction.functionArgs.length > 0 && (
                <>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Arguments:</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {JSON.stringify(transaction.functionArgs)}
                  </Typography>
                </>
              )}
            </Box>
          </Paper>
        )}

        {/* Return Value */}
        {transaction.returnValue && (
          <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
              📤 Return Value
              <IconButton
                size="small"
                onClick={() => handleCopyReturnValue(processReturnValue(transaction.returnValue!))}
                sx={{ 
                  color: copySuccess ? '#4caf50' : '#666',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
                }}
                title="Copy return value to clipboard"
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
              {copySuccess && (
                <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                  {copySuccess}
                </Typography>
              )}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Typography 
                variant="body2" 
                onClick={() => handleReturnValueClick(
                  processReturnValue(transaction.returnValue!), 
                  `Return Value - ${transaction.functionName || 'Contract Execution'}`
                )}
                sx={{ 
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  color: '#2e7d32',
                  cursor: 'pointer',
                  p: 1,
                  bgcolor: 'white',
                  borderRadius: 1,
                  border: '1px solid #e0e0e0',
                  flex: 1,
                  wordBreak: 'break-all',
                  '&:hover': {
                    textDecoration: 'underline',
                    color: '#1b5e20',
                    bgcolor: '#f5f5f5'
                  }
                }}
              >
                {truncateReturnValue(processReturnValue(transaction.returnValue))}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: '#666', mt: 1, display: 'block' }}>
              Click to view full value in popup • Click copy icon to copy to clipboard
            </Typography>
          </Paper>
        )}

        {/* Contract Details */}
        {deployedContract && (
          <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
              📋 Contract Details
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 1, alignItems: 'start', mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Name:</Typography>
              <Typography variant="body2">{deployedContract.name}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Functions:</Typography>
              <Typography variant="body2">
                {deployedContract.functions.map((f) => f.name).join(', ')}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Deployed:</Typography>
              <Typography variant="body2">
                {new Date(deployedContract.deployedAt).toLocaleString()}
              </Typography>
            </Box>
            
            {transaction.type === 'deployment' && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<PlayArrowIcon />}
                onClick={() => handleContractClick(deployedContract)}
                sx={{
                  backgroundColor: '#B05823',
                  '&:hover': {
                    backgroundColor: '#8B4513',
                  },
                  fontWeight: 'bold',
                }}
              >
                Execute Contract
              </Button>
            )}
          </Paper>
        )}

        {/* Error Details */}
        {transaction.error && (
          <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'red.50' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'red.700' }}>
              ❌ Transaction Failed
            </Typography>
            <Typography variant="body2" color="error" sx={{ mb: 1 }}>
              {transaction.error}
            </Typography>
            {transaction.errorDetails && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Error Details:
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 1, alignItems: 'start' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Reason:</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {transaction.errorDetails.reason}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Gas Used:</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {transaction.errorDetails.gasUsed.toString()}
                  </Typography>
                  {transaction.errorDetails.opcode && (
                    <>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Opcode:</Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {transaction.errorDetails.opcode}
                      </Typography>
                    </>
                  )}
                </Box>
                {transaction.errorDetails.revertData && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Revert Data:
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: 'monospace', 
                        fontSize: '0.7rem',
                        backgroundColor: 'grey.100',
                        padding: '8px',
                        borderRadius: '4px',
                        maxHeight: '100px',
                        overflow: 'auto',
                        wordBreak: 'break-all'
                      }}
                    >
                      {transaction.errorDetails.revertData}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        )}

        {/* Event Logs */}
        {transaction.logs && transaction.logs.length > 0 && (
          <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
              📋 Event Logs ({transaction.logs.length})
            </Typography>
            <List dense>
              {transaction.logs.map((log, index) => (
                <ListItem key={index} sx={{ px: 0 }}>
                  <ListItemText
                    primary={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          Event #{index + 1}
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          Address: {formatAddress(log.address)}
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          Topics: {log.topics.map(t => formatHash(t)).join(', ')}
                        </Typography>
                        <Typography variant="body2">
                          Data: 
                          <span
                            onClick={() => handleEventDataClick(log.data, `Event Log #${index + 1} Data`)}
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
                          >
                            {truncateEventData(log.data)}
                          </span>
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="contained" color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
} 