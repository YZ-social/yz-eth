import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Box, IconButton } from '@mui/material';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import { Transaction } from '../../src/blockManager';

interface TransactionSliderBarProps {
  transactions: Transaction[];
  getTransactionTypeIcon: (type: string, tx?: Transaction) => React.ReactNode;
  getTransactionStatusIcon: (status: string) => React.ReactNode;
  onTileClick: (tx: Transaction) => void;
  selectedTxId?: string;
}

const TILE_WIDTH = 180;
const TILE_GAP = 12;
const BAR_HEIGHT = 90;
const OVERSCAN = 3; // Number of tiles to render outside visible area

// Memoized transaction tile component
const TransactionTile = React.memo(({ 
  tx, 
  isSelected, 
  getTransactionTypeIcon, 
  getTransactionStatusIcon, 
  onTileClick 
}: {
  tx: Transaction;
  isSelected: boolean;
  getTransactionTypeIcon: (type: string, tx?: Transaction) => React.ReactNode;
  getTransactionStatusIcon: (status: string) => React.ReactNode;
  onTileClick: (tx: Transaction) => void;
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

  const handleClick = useCallback(() => {
    onTileClick(tx);
  }, [tx, onTileClick]);

  return (
    <Box
      onClick={handleClick}
      sx={{
        minWidth: `${TILE_WIDTH}px`,
        maxWidth: `${TILE_WIDTH}px`,
        minHeight: `${BAR_HEIGHT + 10}px`,
        bgcolor: isSelected ? '#e3f2fd' : '#f5f5f5',
        border: isSelected ? '2px solid #1976d2' : '1px solid #ccc',
        borderRadius: 2,
        boxShadow: isSelected ? '0 2px 8px #1976d233' : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        px: 2,
        pt: '10px',
        pb: '8px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        '&:hover': {
          bgcolor: '#e3f2fd',
          borderColor: '#1976d2',
        },
        overflow: 'hidden',
      }}
    >
      {/* First line: icon, status, tile name */}
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', fontSize: '1.1em', mb: 0.7, mt: '9px' }}>
        <Box sx={{ mr: 1 }}>{getTransactionTypeIcon(tx.type, tx)}</Box>
        <Box sx={{ mr: 1 }}>{getTransactionStatusIcon(tx.status)}</Box>
        <Box
          sx={{
            fontWeight: 700,
            fontSize: '1em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          {tileName}
        </Box>
      </Box>
      {/* Gas line */}
      <Box sx={{ color: '#666', fontSize: '0.85em', mb: '9px', mt: '-11px' }}>
        Gas: {tx.gasUsed?.toString?.() ?? '-'}
      </Box>
      {/* UTC timestamp */}
      <Box
        sx={{ color: '#666', fontSize: '0.6545em', wordBreak: 'break-all', lineHeight: 1.1, mt: '-11px' }}
      >
        {tx.timestamp ? new Date(tx.timestamp).toISOString() : ''}
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
}: TransactionSliderBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const scrollStart = useRef(0);
  const [isInitialized, setIsInitialized] = useState(false);

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
    setIsDragging(true);
    dragStartX.current = e.clientX;
    scrollStart.current = scrollLeft;
    document.body.style.cursor = 'grabbing';
    e.preventDefault();
  }, [scrollLeft]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStartX.current;
    const newScrollLeft = Math.max(0, Math.min(totalWidth - containerWidth, scrollStart.current - dx));
    setScrollLeft(newScrollLeft);
  }, [isDragging, totalWidth, containerWidth]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = '';
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

  // Wheel scroll handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Check if we can actually scroll before preventing default
    const delta = e.deltaX || e.deltaY;
    const newScrollLeft = Math.max(0, Math.min(totalWidth - containerWidth, scrollLeft + delta));
    
    // Only prevent default if we're actually going to scroll
    if (newScrollLeft !== scrollLeft) {
      e.preventDefault();
      setScrollLeft(newScrollLeft);
    }
  }, [totalWidth, containerWidth, scrollLeft]);

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
        height: `${BAR_HEIGHT}px`,
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
          height: `${BAR_HEIGHT - 16}px`,
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          overflow: 'hidden',
          position: 'relative',
        }}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
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
                  isSelected={selectedTxId === tx.id}
                  getTransactionTypeIcon={getTransactionTypeIcon}
                  getTransactionStatusIcon={getTransactionStatusIcon}
                  onTileClick={onTileClick}
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