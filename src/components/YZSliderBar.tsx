import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Box, 
  IconButton, 
  Typography, 
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Select,
  MenuItem,
  TextField,
  Chip,
  CircularProgress
} from '@mui/material';
import { 
  ArrowBackIos, 
  ArrowForwardIos,
  Close as CloseIcon,
  PlayArrow as PlayArrowIcon
} from '@mui/icons-material';
import { useMultisynq } from './YZProvider';
import TransactionDetailsModal from './TransactionDetailsModal';
import { formatHash, formatAddress, formatId } from '../utils/formatters';

// Constants for the slider bar
const TILE_WIDTH = 140;
const TILE_GAP = 8;
const BAR_HEIGHT = 100;
const OVERSCAN = 2; // Render extra tiles outside viewport for smooth scrolling

// Transaction tile component (for both executed and pending)
interface TransactionTileProps {
  tx: any;
  txNumber: number;
  onClick: (tx: any) => void;
  pending?: boolean;
}
const TransactionTile = React.memo(({ tx, txNumber, onClick, pending }: TransactionTileProps) => {
  // Helper functions for formatting
  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  // Get transaction type information for display
  const getTransactionTypeInfo = (tx: any) => {
    if (!tx) return { label: 'Empty', icon: '📦', color: '#757575' };
    switch (tx.type) {
      case 'contract_deployment':
        return { label: 'Contract', icon: '🤝', color: '#2196f3', details: tx.contractName || 'Contract' };
      case 'contract_execution':
        return { label: 'Transaction', icon: '▶️', color: '#ff9800', details: tx.contractName && tx.functionName ? `${tx.contractName}.${tx.functionName}()` : (tx.functionName || 'function()') };
      case 'eth_transfer':
        return { label: 'Transfer', icon: '💸', color: '#4caf50', details: `${tx.value || '0'} WEI` };
      case 'account_creation':
        return { label: 'Account', icon: '👤', color: '#2196f3', details: formatAddress(tx.to) };
      default:
        return { label: tx.type || 'Unknown', icon: '📄', color: '#757575', details: 'Transaction' };
    }
  };
  const txInfo = getTransactionTypeInfo(tx);

  // Color logic
  const tileBg = pending ? '#fff3e0' : '#f1f8e9';
  const borderColor = pending ? '#ff9800' : '#4caf50';
  const labelColor = pending ? '#ff9800' : '#4caf50';

  return (
    <Box
      onClick={() => onClick(tx)}
      sx={{
        width: `${TILE_WIDTH}px`,
        height: `${BAR_HEIGHT}px`,
        border: '2px solid #e0e0e0',
        borderRadius: '8px',
        bgcolor: tileBg,
        borderColor: borderColor,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        p: 1,
        transition: 'all 0.2s ease',
        boxShadow: pending ? '0 2px 4px rgba(255,152,0,0.3)' : 'none',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          bgcolor: pending ? '#ffe0b2' : '#dcedc8',
        },
      }}
    >
      {/* Top section: TX number */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography
          variant="caption"
          sx={{
            color: labelColor,
            fontSize: '0.7em',
            fontWeight: 'bold'
          }}
        >
          TX {txNumber}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: labelColor,
            fontSize: '0.6em',
            fontWeight: 'bold'
          }}
        >
          {pending ? 'Pending' : 'Executed'}
        </Typography>
      </Box>

      {/* Middle section: Transaction info */}
      <Box sx={{ textAlign: 'center', my: 0.5, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Typography
          variant="caption"
          sx={{
            color: txInfo.color,
            fontSize: '0.65em',
            fontWeight: 'bold',
            display: 'inline-block',
            mb: 0.5
          }}
        >
          {txInfo.icon} {txInfo.label}
        </Typography>
        {/* Contract deployment button or transaction details */}
        {tx.type === 'contract_deployment' && !pending ? (
          <Button
            variant="contained"
            size="small"
            onClick={e => {
              e.stopPropagation();
              onClick(tx);
            }}
            sx={{
              fontSize: '0.6em',
              minHeight: '20px',
              py: 0.3,
              px: 0.8,
              bgcolor: '#2196f3',
              '&:hover': { bgcolor: '#1976d2' },
              textTransform: 'none'
            }}
          >
            🔧 {tx.contractName || 'Contract'}
          </Button>
        ) : (
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.6em',
              color: '#666',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {txInfo.details}
          </Typography>
        )}
      </Box>
      {/* Bottom section: Timestamp */}
      <Box sx={{ width: '100%' }}>
        <Typography
          variant="caption"
          sx={{
            color: '#888',
            fontSize: '0.6em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.1,
            display: 'block'
          }}
        >
          {formatTimestamp(tx.timestamp)}
        </Typography>
      </Box>
    </Box>
  );
});

const YZSliderBar: React.FC = () => {
  const { blockchainState, publish } = useMultisynq();
  
  // Existing state
  const barRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [userInteracting, setUserInteracting] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  
  // Drag state
  const dragStartX = useRef(0);
  const scrollStart = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // Modal state
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  
  // Contract execution state
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [selectedFunction, setSelectedFunction] = useState<string>('');
  const [functionArgs, setFunctionArgs] = useState<string>('[]');
  const [executionOutput, setExecutionOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  
  // Refs for tracking state
  const userInteractionTimer = useRef<NodeJS.Timeout | null>(null);
  const lastBlockCount = useRef(0);
  
  // Track if initial autoscroll has been performed
  const initialScrollDone = useRef(false);
  const lastTileCount = useRef(0);
  
  // Get blocks from Multisynq state
  const blocks = blockchainState?.blocks || [];
  
  // Get deployed contracts from Multisynq state
  const deployedContracts = blockchainState?.contracts || [];
  
  // Compute all transactions (executed + pending) for slider logic
  const executedTxs = blocks.flatMap(block =>
    (block.transactions || []).map((tx: any) => ({ ...tx, _block: block }))
  );
  const pendingTxs = (blockchainState?.pendingTransactions || []).map((tx: any) => ({ ...tx }));
  const allTxs = [...executedTxs, ...pendingTxs];

  // Calculate visible range with virtualization based on allTxs
  const { visibleStart, visibleEnd, totalWidth, tilesPerPage } = useMemo(() => {
    if (containerWidth <= 0) {
      return { visibleStart: 0, visibleEnd: allTxs.length, totalWidth: 0, tilesPerPage: 1 };
    }
    const tileWithGap = TILE_WIDTH + TILE_GAP;
    const tilesPerPage = Math.max(1, Math.floor(containerWidth / tileWithGap));
    const totalWidth = allTxs.length * tileWithGap;
    // Calculate which tiles are visible - with generous bounds
    const startIndex = Math.max(0, Math.floor(scrollLeft / tileWithGap) - OVERSCAN);
    const endIndex = Math.min(
      allTxs.length,
      Math.ceil((scrollLeft + containerWidth) / tileWithGap) + OVERSCAN
    );
    return {
      visibleStart: startIndex,
      visibleEnd: endIndex,
      totalWidth,
      tilesPerPage,
    };
  }, [scrollLeft, containerWidth, allTxs.length]);

  // Helper function to calculate scroll bounds consistently
  const getScrollBounds = useCallback(() => {
    // Always get fresh container width from the DOM - try multiple methods
    let currentContainerWidth = 0;
    if (barRef.current) {
      currentContainerWidth = barRef.current.clientWidth;
      if (currentContainerWidth === 0) {
        currentContainerWidth = barRef.current.offsetWidth;
      }
      if (currentContainerWidth === 0) {
        currentContainerWidth = barRef.current.getBoundingClientRect().width;
      }
    }
    // Use state containerWidth as fallback
    const safeContainerWidth = currentContainerWidth > 0 ? currentContainerWidth : containerWidth;
    // If we got a valid measurement that's different from state, update the state
    if (currentContainerWidth > 0 && currentContainerWidth !== containerWidth) {
      setContainerWidth(currentContainerWidth);
    }
    // Use allTxs.length for scroll bounds
    if (safeContainerWidth <= 0 || allTxs.length === 0) {
      return { maxScroll: 0, adjustedTotalWidth: 0 };
    }
    const tileWithGap = TILE_WIDTH + TILE_GAP;
    const adjustedTotalWidth = (allTxs.length - 1) * tileWithGap + TILE_WIDTH;
    const maxScroll = Math.max(0, adjustedTotalWidth - safeContainerWidth);
    return { maxScroll, adjustedTotalWidth };
  }, [allTxs.length, containerWidth]);

  // Update container width
  useEffect(() => {
    const updateContainerWidth = () => {
      if (barRef.current) {
        const width = barRef.current.clientWidth;
        console.log("=== CONTAINER WIDTH UPDATE ===", { 
          width, 
          element: barRef.current,
          offsetWidth: barRef.current.offsetWidth,
          scrollWidth: barRef.current.scrollWidth
        });
        setContainerWidth(width);
        if (!isInitialized) {
          setIsInitialized(true);
        }
      }
    };

    // Use setTimeout to ensure DOM is ready
    const measureWidth = () => {
      updateContainerWidth();
      // Also try measuring after a small delay
      setTimeout(updateContainerWidth, 100);
    };

    measureWidth();
    window.addEventListener('resize', updateContainerWidth);
    
    // Also measure when component is mounted
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const width = entry.contentRect.width;
        // console.log("=== RESIZE OBSERVER ===", { width });
        setContainerWidth(width);
      }
    });
    
    if (barRef.current) {
      resizeObserver.observe(barRef.current);
    }
    
    return () => {
      window.removeEventListener('resize', updateContainerWidth);
      resizeObserver.disconnect();
    };
  }, [isInitialized]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (userInteractionTimer.current) {
        clearTimeout(userInteractionTimer.current);
      }
    };
  }, []);

  // Track user interactions to prevent auto-scroll interference
  const markUserInteraction = useCallback(() => {
    setUserInteracting(true);
    // Clear any existing timer
    if (userInteractionTimer.current) {
      clearTimeout(userInteractionTimer.current);
    }
    // Reset user interaction flag after 3 seconds of no interaction
    userInteractionTimer.current = setTimeout(() => {
      setUserInteracting(false);
    }, 3000);
  }, []);

  // Auto-scroll to show the latest tile when NEW tiles are added or on initial load
  useEffect(() => {
    if (isInitialized && allTxs.length > 0 && containerWidth > 0) {
      const hasNewTiles = allTxs.length > lastBlockCount.current;
      const previousTileCount = lastBlockCount.current;
      lastBlockCount.current = allTxs.length;
      const { maxScroll } = getScrollBounds();
      const tileWithGap = TILE_WIDTH + TILE_GAP;
      const previousLastTileIndex = previousTileCount - 1;
      const previousLastTileLeft = previousLastTileIndex * tileWithGap;
      const previousLastTileRight = previousLastTileLeft + TILE_WIDTH;
      const viewportLeft = scrollLeft;
      const viewportRight = scrollLeft + containerWidth;
      const wasLastTileVisible = previousLastTileIndex >= 0 && 
        (previousLastTileLeft < viewportRight) && (previousLastTileRight > viewportLeft);
      // On initial load or if user is at the right, autoscroll to rightmost
      if ((hasNewTiles && !userInteracting && wasLastTileVisible) || (scrollLeft === 0 && previousTileCount === 0)) {
        setScrollLeft(maxScroll);
      }
      // On first load, if there are tiles, autoscroll to right
      if (previousTileCount === 0 && allTxs.length > 0 && scrollLeft !== maxScroll) {
        setScrollLeft(maxScroll);
      }
    }
  }, [allTxs.length, isInitialized, scrollLeft, userInteracting, containerWidth, getScrollBounds]);

  // --- AUTOSCROLL LOGIC RESTORED/IMPROVED ---
  // On initial load or when allTxs is first populated, autoscroll to rightmost tile
  useEffect(() => {
    if (!initialScrollDone.current && allTxs.length > 0 && containerWidth > 0) {
      const { maxScroll } = getScrollBounds();
      setScrollLeft(maxScroll);
      initialScrollDone.current = true;
    }
    // Reset flag if allTxs becomes empty (e.g., session reset)
    if (allTxs.length === 0) {
      initialScrollDone.current = false;
    }
  }, [allTxs.length, containerWidth, getScrollBounds]);

  // When new tiles are added and user is at right, autoscroll to new tile
  useEffect(() => {
    if (allTxs.length > lastTileCount.current && containerWidth > 0) {
      const { maxScroll } = getScrollBounds();
      // If user was at (or very near) the right before new tile, autoscroll
      if (Math.abs(scrollLeft - maxScroll) < (TILE_WIDTH + TILE_GAP + 2)) {
        setScrollLeft(maxScroll);
      }
      lastTileCount.current = allTxs.length;
    } else if (allTxs.length < lastTileCount.current) {
      // If tiles were removed (e.g., reset), update count
      lastTileCount.current = allTxs.length;
    }
  }, [allTxs.length, containerWidth, scrollLeft, getScrollBounds]);

  // Handle scroll to position
  const scrollToPosition = useCallback((newScrollLeft: number) => {
    const { maxScroll } = getScrollBounds();
    
    // Don't block if we have a valid maxScroll, even if containerWidth state is 0
    if (maxScroll === 0) {
      return; // Only block if bounds calculation indicates no scrolling possible
    }
    
    const clampedScroll = Math.max(0, Math.min(newScrollLeft, maxScroll));
    setScrollLeft(clampedScroll);
  }, [getScrollBounds]);

  // Handle arrow clicks
  const handleArrowClick = useCallback((direction: 'left' | 'right') => {
    
    markUserInteraction();
    const step = TILE_WIDTH + TILE_GAP;
    const newScrollLeft = direction === 'left' 
      ? scrollLeft - step 
      : scrollLeft + step;
    
    scrollToPosition(newScrollLeft);
  }, [scrollLeft, markUserInteraction, scrollToPosition]);

  // Mouse drag handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    markUserInteraction();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    scrollStart.current = scrollLeft;
    setHasMoved(false);
  }, [scrollLeft, markUserInteraction]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const deltaX = e.clientX - dragStartX.current;
    const newScrollLeft = scrollStart.current - deltaX;
    
    if (Math.abs(deltaX) > 3) {
      setHasMoved(true);
    }
    
    scrollToPosition(newScrollLeft);
  }, [isDragging, scrollToPosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Prevent click after drag
  const shouldPreventClick = useCallback(() => {
    return hasMoved;
  }, [hasMoved]);

  // Handle block click - show transaction details modal or contract execution
  const handleBlockClick = useCallback((tx: any) => {
    // Special handling for contract deployment - show contract execution dialog
    if (tx.type === 'contract_deployment') {
      const contractInfo: any = {
        name: tx.contractName,
        address: tx.to,
        abi: [], // We'll get this from the blockchain state
        functions: [] // Will be populated from ABI
      };
      
      // Try to find the contract in deployed contracts
      const deployedContract = deployedContracts.find(
        contract => contract.address === tx.to
      );
      
      if (deployedContract) {
        contractInfo.abi = deployedContract.abi || [];
        
        // Generate functions array from ABI (same logic as App.tsx)
        contractInfo.functions = contractInfo.abi
          .filter((item: any) => item.type === 'function')
          .map((func: any) => ({
            signature: `${func.name}(${func.inputs.map((input: any) => `${input.type} ${input.name}`).join(', ')}) → ${func.outputs.length > 0 ? func.outputs.map((output: any) => output.type).join(', ') : 'void'}`,
            name: func.name,
            inputs: func.inputs,
            outputs: func.outputs,
            stateMutability: func.stateMutability,
          }));
          
        console.log("MultisynqSliderBar: Contract found with ABI:", {
          name: contractInfo.name,
          address: formatAddress(contractInfo.address),
          abiLength: contractInfo.abi.length,
          functionsCount: contractInfo.functions.length,
          functions: contractInfo.functions.map((f: any) => f.name)
        });
      } else {
        console.warn("MultisynqSliderBar: Contract not found in deployed contracts:", {
          transactionTo: formatAddress(tx.to),
          availableContracts: deployedContracts.map(c => ({
            name: c.name,
            address: formatAddress(c.address)
          }))
        });
      }
      
      setSelectedContract(contractInfo);
      setSelectedFunction('');
      setFunctionArgs('[]');
      setExecutionOutput('');
      setShowContractDialog(true);
      return;
    }
    
    // Default behavior - show transaction details modal
    const adaptedTransaction = {
      id: tx.hash || 'unknown',
      type: tx.type === 'contract_deployment' ? 'deployment' : 
            tx.type === 'contract_execution' ? 'function_call' :
            tx.type === 'eth_transfer' ? 'eth_transfer' : tx.type,
      from: tx.from,
      to: tx.to,
      data: tx.data || '',
      value: tx.value || '0',
      timestamp: tx.timestamp,
      status: tx.status === 'success' ? 'executed' : tx.status,
      functionName: tx.functionName,
      contractAddress: tx.to,
      // Add other fields as needed
      gasUsed: BigInt(21000), // Default gas
      gasPrice: BigInt(20000000000), // 20 gwei
      nonce: BigInt(0),
      logs: [],
      metadata: {
        blockNumber: BigInt(tx._block?.number || 0),
        transactionIndex: 0
      }
    };
    
    setSelectedTransaction(adaptedTransaction);
    setShowTransactionDetails(true);
  }, [deployedContracts]);

  // Contract execution handlers
  const handleCloseContractDialog = useCallback(() => {
    setShowContractDialog(false);
    setSelectedContract(null);
    setSelectedFunction('');
    setFunctionArgs('[]');
    setExecutionOutput('');
  }, []);

  const handleFunctionChange = useCallback((event: any) => {
    const selectedValue = event.target.value;
    setSelectedFunction(selectedValue);

    // Auto-generate JSON array with sample data based on selected function
    if (selectedContract && selectedValue) {
      const functionInfo = selectedContract.functions.find(
        (f: any) => f.signature === selectedValue,
      );
      
      if (functionInfo && functionInfo.inputs && functionInfo.inputs.length > 0) {
        const exampleArgs = functionInfo.inputs.map((input: any) => {
          switch (input.type) {
            case 'uint256':
            case 'uint8':
            case 'uint16':
            case 'uint32':
            case 'uint64':
            case 'uint128':
              return '1000';
            case 'int256':
            case 'int8':
            case 'int16':
            case 'int32':
            case 'int64':
            case 'int128':
              return '1000';
            case 'address':
              return '"0x742d35cc6434c0532925a3b8d6ac6c3e98d9dc5b"';
            case 'string':
              return '"Hello World"';
            case 'bool':
              return 'true';
            case 'bytes':
            case 'bytes32':
              return '"0xabcdef1234567890"';
            default:
              // Handle arrays and other complex types
              if (input.type.includes('[]')) {
                return '[]';
              }
              return 'null';
          }
        });
        const generatedArgs = `[${exampleArgs.join(', ')}]`;
        console.log('🎯 Auto-generated function arguments for', functionInfo.name + ':', generatedArgs);
        setFunctionArgs(generatedArgs);
      } else {
        console.log('🎯 Function has no parameters, setting empty array for', functionInfo?.name || 'unknown function');
        setFunctionArgs('[]');
      }
    } else {
      setFunctionArgs('[]');
    }
  }, [selectedContract]);

  const handleArgsChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setFunctionArgs(event.target.value);
  }, []);

  const handleExecuteFunction = useCallback(async () => {
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

      // Publish execution request through Multisynq
      const executionData = {
        contractName: selectedContract.name,
        functionName: functionInfo.name,
        functionArgs: args,
        from: "0x1234567890123456789012345678901234567890", // Default account
        abi: selectedContract.abi
      };

      console.log("MultisynqSliderBar: Publishing contract execution:", {
        ...executionData,
        from: formatAddress(executionData.from)
      });
      publish('blockchain', 'executeTransaction', executionData);
      
      setExecutionOutput('🚀 Function execution submitted to blockchain!\n⏳ Transaction added to pending queue...\n💡 Click "Mine Block" in the status bar to process immediately, or wait up to 15 seconds for auto-mining.');
      
    } catch (error: any) {
      setExecutionOutput(
        `❌ Error: ${error.message || 'An error occurred while executing the function'}`,
      );
    } finally {
      setIsExecuting(false);
    }
  }, [selectedFunction, selectedContract, functionArgs, publish]);

  // Helper function to get contract functions
  const getContractFunctions = useCallback((contract: any) => {
    return contract.functions || [];
  }, []);

  // Helper function to render function info
  const renderFunctionInfo = useCallback((functionInfo: any) => {
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
  }, []);

  // Check if we can scroll (simplified bounds check)
  const { maxScroll, adjustedTotalWidth } = getScrollBounds();
  const canScrollLeft = scrollLeft > 0;
  const canScrollRight = scrollLeft < maxScroll;
  
  // Don't render if no blockchain state
  if (!blockchainState) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1201,
        bgcolor: '#fff',
        borderTop: '2px solid #B05823',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.08)',
        height: `${BAR_HEIGHT + 50}px`,
        display: 'flex',
        alignItems: 'center',
        px: 2,
      }}
    >
      <IconButton
        onClick={() => handleArrowClick('left')}
        disabled={!canScrollLeft}
        sx={{ mr: 1, opacity: canScrollLeft ? 1 : 0.3 }}
        size="large"
      >
        <ArrowBackIos />
      </IconButton>
      
      <Box
        ref={barRef}
        onMouseDown={handleMouseDown}
        sx={{
          flex: 1,
          height: `${BAR_HEIGHT + 30}px`,
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* Virtual scrolling container */}
        <Box
          sx={{
            position: 'relative',
            width: `${totalWidth}px`,
            height: '100%',
            transform: `translateX(-${scrollLeft}px)`,
            transition: isDragging ? 'none' : 'transform 0.2s ease',
          }}
        >
          {/* Render visible tiles: executed + pending transactions */}
          {(() => {
            const visibleTxs = allTxs.slice(visibleStart, visibleEnd);
            return visibleTxs.map((tx: any, index: number) => {
              const actualIndex = visibleStart + index;
              const left = actualIndex * (TILE_WIDTH + TILE_GAP);
              const pending = actualIndex >= executedTxs.length;
              return (
                <Box
                  key={tx.hash || actualIndex}
                  sx={{
                    position: 'absolute',
                    left: `${left}px`,
                    top: 0,
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <TransactionTile
                    tx={tx}
                    txNumber={actualIndex + 1}
                    onClick={shouldPreventClick() ? () => {} : handleBlockClick}
                    pending={pending}
                  />
                </Box>
              );
            });
          })()}
        </Box>
        
        {/* Block count indicator */}
        {blocks.length > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: 4,
              right: 8,
              bgcolor: 'rgba(0,0,0,0.7)',
              color: 'white',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              fontSize: '0.75em',
              pointerEvents: 'none',
            }}
          >
            {/* Show total number of transactions across all blocks */}
            {blocks.reduce((sum, block) => sum + (block.transactions?.length || 0), 0)} TX
          </Box>
        )}
      </Box>
      
      <IconButton
        onClick={() => handleArrowClick('right')}
        disabled={!canScrollRight}
        sx={{ ml: 1, opacity: canScrollRight ? 1 : 0.3 }}
        size="large"
      >
        <ArrowForwardIos />
      </IconButton>

      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        open={showTransactionDetails}
        onClose={() => setShowTransactionDetails(false)}
        transaction={selectedTransaction}
        deployedContracts={deployedContracts}
      />
      
      {/* Contract Execution Dialog */}
      <Dialog
        open={showContractDialog}
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
                {formatAddress(selectedContract?.address)}
              </Typography>
            </Box>
          </Paper>

          {/* Available Functions */}
          {selectedContract && (
            <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                ⚙️ Available Functions ({selectedContract.functions?.length || 0})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {(selectedContract.functions || []).slice(0, 5).map((func: any) => (
                  <Chip
                    key={func.name}
                    label={func.name}
                    size="small"
                    variant="outlined"
                    color={func.stateMutability === 'view' ? 'info' : 'primary'}
                  />
                ))}
                {(selectedContract.functions || []).length > 5 && (
                  <Chip
                    label={`+${(selectedContract.functions || []).length - 5} more`}
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
  );
}; 
export default YZSliderBar; 