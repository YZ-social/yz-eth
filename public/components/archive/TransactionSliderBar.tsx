import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Box, IconButton, Button } from '@mui/material';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { Transaction } from '../../src/blockManager';

interface DeployedContract {
  address: string;
  name: string;
  deploymentTxId: string;
  abi: any[];
  functions: any[];
  deployedAt: number;
}

interface TransactionSliderBarProps {
  transactions: Transaction[];
  getTransactionTypeIcon: (type: string, tx?: Transaction) => React.ReactNode;
  getTransactionStatusIcon: (status: string) => React.ReactNode;
  onTileClick: (tx: Transaction) => void;
  selectedTxId?: string;
  deployedContracts?: DeployedContract[];
  onContractExecute?: (contract: DeployedContract) => void;
}

const TILE_WIDTH = 160;
const TILE_GAP = 12;
const BAR_HEIGHT = 82; // Reduced height by 25% for more compact tiles
const OVERSCAN = 3; // Number of tiles to render outside visible area

// Memoized transaction tile component
const TransactionTile = React.memo(({ 
  tx, 
  txNumber,
  isSelected, 
  getTransactionTypeIcon, 
  getTransactionStatusIcon, 
  onTileClick,
  deployedContracts,
  onContractExecute,
  shouldPreventClick
}: {
  tx: Transaction;
  txNumber: number;
  isSelected: boolean;
  getTransactionTypeIcon: (type: string, tx?: Transaction) => React.ReactNode;
  getTransactionStatusIcon: (status: string) => React.ReactNode;
  onTileClick: (tx: Transaction) => void;
  deployedContracts?: DeployedContract[];
  onContractExecute?: (contract: DeployedContract) => void;
  shouldPreventClick?: () => boolean;
}) => {
  // Memoize tile name calculation
  const tileName = useMemo(() => {
    if (tx.type === 'account_creation' && tx.from === '0x0000000000000000000000000000000000000000') {
      return 'Genesis';
    } else if (tx.type === 'account_creation') {
      return 'Account';
    } else if (tx.type === 'deployment') {
      return 'Contract';
    } else if (tx.type === 'function_call') {
      return 'Execution';
    } else if (tx.type === 'contract_call') {
      return 'Call';
    } else if (tx.type === 'eth_transfer') {
      return 'Transfer';
    } else {
      return String(tx.type).replace('_', ' ');
    }
  }, [tx.type, tx.from]);

  // Find deployed contract for this transaction
  const deployedContract = useMemo(() => {
    if (!deployedContracts) return null;
    return deployedContracts.find(c => c.deploymentTxId === tx.id);
  }, [deployedContracts, tx.id]);

  // Find the contract that was called for function calls and contract calls
  const calledContract = useMemo(() => {
    if (!deployedContracts || (!['function_call', 'contract_call'].includes(tx.type)) || !tx.to) return null;
    return deployedContracts.find(c => c.address.toLowerCase() === tx.to!.toLowerCase());
  }, [deployedContracts, tx.type, tx.to]);

  // Calculate transaction subtitle (contract name or description)
  const transactionSubtitle = useMemo(() => {
    if (tx.type === 'account_creation') {
      return tx.from === '0x0000000000000000000000000000000000000000' ? 'Genesis Account' : 'Creation';
    } else if (tx.type === 'deployment' && deployedContract) {
      return deployedContract.name;
    } else if ((tx.type === 'function_call' || tx.type === 'contract_call') && calledContract) {
      return calledContract.name;
    } else if ((tx.type === 'function_call' || tx.type === 'contract_call') && tx.functionName) {
      return tx.functionName + '()';
    } else if (tx.type === 'eth_transfer') {
      return `${parseFloat((Number(tx.value) / 1e18).toFixed(4))} ETH`;
    }
    return null;
  }, [tx, deployedContract, calledContract]);

  const handleClick = useCallback(() => {
    // Prevent click if we're in the middle of a drag operation
    if (shouldPreventClick && shouldPreventClick()) {
      return;
    }
    onTileClick(tx);
  }, [tx, onTileClick, shouldPreventClick]);

  const handleContractExecute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent tile click
    if (deployedContract && onContractExecute) {
      onContractExecute(deployedContract);
    }
  }, [deployedContract, onContractExecute]);

  return (
    <Box
      onClick={handleClick}
      sx={{
        minWidth: `${TILE_WIDTH}px`,
        maxWidth: `${TILE_WIDTH}px`,
        height: `${BAR_HEIGHT + 20}px`, // Fixed height instead of minHeight
        bgcolor: isSelected ? '#e3f2fd' : '#f5f5f5',
        border: isSelected ? '2px solid #1976d2' : '1px solid #ccc',
        borderRadius: 2,
        boxShadow: isSelected ? '0 2px 8px #1976d233' : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        px: 1.2,
        py: 1.0,
        cursor: 'pointer',
        transition: 'all 0.15s',
        '&:hover': {
          bgcolor: '#e3f2fd',
          borderColor: '#1976d2',
        },
        overflow: 'hidden',
      }}
    >
      {/* Top section: icon, status, tile name */}
      <Box sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 0.2 }}>
          <Box sx={{ mr: 0.8 }}>{getTransactionTypeIcon(tx.type, tx)}</Box>
          <Box sx={{ mr: 0.8 }}>{getTransactionStatusIcon(tx.status)}</Box>
          <Box
            sx={{
              fontWeight: 700,
              fontSize: '0.9em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            {tileName}
          </Box>
        </Box>
        
        {/* Transaction subtitle/contract name */}
        {transactionSubtitle && (
          <Box sx={{ width: '100%', mb: 0.1 }}>
            {tx.type === 'deployment' && deployedContract ? (
              <Button
                onClick={handleContractExecute}
                size="small"
                variant="contained"
                startIcon={<PlayArrowIcon />}
                sx={{
                  backgroundColor: '#B05823',
                  fontSize: '0.7rem',
                  py: 0.2,
                  px: 0.6,
                  minHeight: 'auto',
                  width: '100%',
                  mt: -0.3,
                  '&:hover': {
                    backgroundColor: '#8B4513',
                  },
                }}
              >
                {deployedContract.name}
              </Button>
            ) : (
              <Box
                sx={{
                  fontSize: '0.8em',
                  fontWeight: 600,
                  color: '#444',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '100%',
                }}
              >
                {transactionSubtitle}
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Bottom section: gas and timestamp */}
      <Box sx={{ width: '100%', mt: 0.3 }}>
        <Box sx={{ color: '#666', fontSize: '0.7em', mb: 0.2 }}>
          TX: {txNumber}, Gas: {tx.gasUsed?.toString?.() ?? '-'}
        </Box>
        <Box
          sx={{ 
            color: '#888', 
            fontSize: '0.6em', 
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.1 
          }}
        >
          {tx.timestamp ? new Date(tx.timestamp).toLocaleString() : ''}
        </Box>
      </Box>
    </Box>
  );
});

TransactionTile.displayName = 'TransactionTile';

export default function TransactionSliderBar({
  transactions,
  getTransactionTypeIcon,
  getTransactionStatusIcon,
  onTileClick,
  selectedTxId,
  deployedContracts,
  onContractExecute,
}: TransactionSliderBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const scrollStart = useRef(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const hasMoved = useRef(false);

  // Calculate visible range with virtualization
  const { visibleStart, visibleEnd, totalWidth, tilesPerPage } = useMemo(() => {
    const tileWithGap = TILE_WIDTH + TILE_GAP;
    const tilesPerPage = Math.max(1, Math.floor(containerWidth / tileWithGap));
    const totalWidth = transactions.length * tileWithGap;
    
    // Calculate which tiles are visible
    const startIndex = Math.max(0, Math.floor(scrollLeft / tileWithGap) - OVERSCAN);
    const endIndex = Math.min(
      transactions.length,
      Math.ceil((scrollLeft + containerWidth) / tileWithGap) + OVERSCAN
    );

    return {
      visibleStart: startIndex,
      visibleEnd: endIndex,
      totalWidth,
      tilesPerPage,
    };
  }, [scrollLeft, containerWidth, transactions.length]);

  // Get visible transactions
  const visibleTransactions = useMemo(() => {
    return transactions.slice(visibleStart, visibleEnd);
  }, [transactions, visibleStart, visibleEnd]);

  // Debounced resize handler
  const updateContainerWidth = useCallback(() => {
    if (barRef.current) {
      setContainerWidth(barRef.current.offsetWidth);
    }
  }, []);

  useEffect(() => {
    // Initial width calculation with multiple attempts
    updateContainerWidth();
    
    // Try again after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      updateContainerWidth();
    }, 50);
    
    // Also try after a longer delay for safety
    const timeoutId2 = setTimeout(() => {
      updateContainerWidth();
    }, 200);
    
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      setTimeout(updateContainerWidth, 100);
    };
    
    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
    };
  }, [updateContainerWidth]);

  // Auto-scroll to latest transaction
  useEffect(() => {
    if (transactions.length > 0 && containerWidth > 0) {
      const maxScroll = Math.max(0, totalWidth - containerWidth);
      setScrollLeft(maxScroll);
      setIsInitialized(true);
    }
  }, [transactions.length, totalWidth, containerWidth]);

  // Drag/touch scroll handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Ensure mouse events work regardless of touch state
    setIsDragging(true);
    dragStartX.current = e.clientX;
    scrollStart.current = scrollLeft;
    hasMoved.current = false; // Reset movement tracking
    document.body.style.cursor = 'grabbing';
    e.preventDefault();
    e.stopPropagation();
  }, [scrollLeft]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const dx = e.clientX - dragStartX.current;
    
    // Track if mouse has moved significantly (more than 3 pixels)
    if (Math.abs(dx) > 3) {
      hasMoved.current = true;
    }
    
    const newScrollLeft = Math.max(0, Math.min(totalWidth - containerWidth, scrollStart.current - dx));
    setScrollLeft(newScrollLeft);
  }, [isDragging, totalWidth, containerWidth]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    setIsDragging(false);
    document.body.style.cursor = '';
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Function to check if click should be prevented due to dragging
  const shouldPreventClick = useCallback(() => {
    return hasMoved.current;
  }, []);

  // Touch handlers for trackpad gestures (native events to avoid passive listener issues)
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      // Only handle touch if not already dragging (prevents conflict with mouse)
      if (!isDragging) {
        setIsDragging(true);
        dragStartX.current = e.touches[0].clientX;
        scrollStart.current = scrollLeft;
      }
      e.preventDefault();
    }
  }, [scrollLeft, isDragging]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const dx = e.touches[0].clientX - dragStartX.current;
    const newScrollLeft = Math.max(0, Math.min(totalWidth - containerWidth, scrollStart.current - dx));
    setScrollLeft(newScrollLeft);
  }, [isDragging, totalWidth, containerWidth]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Arrow navigation
  const handleArrowClick = useCallback((direction: 'left' | 'right') => {
    const tileWithGap = TILE_WIDTH + TILE_GAP;
    const scrollAmount = tilesPerPage * tileWithGap;
    
    if (direction === 'left') {
      setScrollLeft(prev => Math.max(0, prev - scrollAmount));
    } else {
      setScrollLeft(prev => Math.min(totalWidth - containerWidth, prev + scrollAmount));
    }
  }, [tilesPerPage, totalWidth, containerWidth]);

  // Wheel scroll handler (native event to avoid passive listener issues)
  const handleWheel = useCallback((e: WheelEvent) => {
    // Always prevent default to stop browser navigation on macOS
    e.preventDefault();
    e.stopPropagation();
    
    const delta = e.deltaX || e.deltaY;
    const newScrollLeft = Math.max(0, Math.min(totalWidth - containerWidth, scrollLeft + delta));
    
    // Update scroll position
    setScrollLeft(newScrollLeft);
  }, [totalWidth, containerWidth, scrollLeft]);

  // Setup native event listeners to avoid passive listener issues
  useEffect(() => {
    const element = barRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('wheel', handleWheel);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleWheel]);

  const canScrollLeft = scrollLeft > 0;
  const canScrollRight = scrollLeft < totalWidth - containerWidth;

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
        height: `${BAR_HEIGHT + 40}px`, // Container height for compact tiles
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
        <ArrowBackIosIcon />
      </IconButton>
      
              <Box
          ref={barRef}
          sx={{
            flex: 1,
            height: `${BAR_HEIGHT + 24}px`, // Scroll area height for compact tiles
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            overflow: 'hidden',
            position: 'relative',
          }}
          onMouseDown={handleMouseDown}
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
          {/* Render only visible tiles */}
          {visibleTransactions.map((tx, index) => {
            const actualIndex = visibleStart + index;
            const left = actualIndex * (TILE_WIDTH + TILE_GAP);
            
            return (
              <Box
                key={tx.id}
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
                  isSelected={selectedTxId === tx.id}
                  getTransactionTypeIcon={getTransactionTypeIcon}
                  getTransactionStatusIcon={getTransactionStatusIcon}
                  onTileClick={onTileClick}
                  deployedContracts={deployedContracts}
                  onContractExecute={onContractExecute}
                  shouldPreventClick={shouldPreventClick}
                />
              </Box>
            );
          })}
        </Box>
        
        {/* Transaction count indicator */}
        {transactions.length > 0 && (
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
            {transactions.length} txns
          </Box>
        )}
      </Box>
      
      <IconButton
        onClick={() => handleArrowClick('right')}
        disabled={!canScrollRight}
        sx={{ ml: 1, opacity: canScrollRight ? 1 : 0.3 }}
        size="large"
      >
        <ArrowForwardIosIcon />
      </IconButton>
    </Box>
  );
} 