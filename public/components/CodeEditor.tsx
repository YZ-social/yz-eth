import {
  Clear as ClearIcon,
  CloudUpload as DeployIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material'
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import AceEditor from 'react-ace'
// Removed import for mode-solidity as it's not available by default
// import 'ace-builds/src-noconflict/mode-solidity';
import 'ace-builds/src-noconflict/theme-monokai'
import { BlockManager } from '../../src/blockManager'
import { SolidityExecutor } from '../../src/solidityExecutor'
import { useMultisynq } from '../../src/components/YZProvider'
import { formatAddress } from '../../src/utils/formatters';

interface CodeEditorProps {
  executor: SolidityExecutor
  blockManager: BlockManager
  code: string
  setCode: (code: string) => void
}



export default function CodeEditor({ executor, blockManager, code, setCode }: CodeEditorProps) {
  const { publish } = useMultisynq()
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const editorRef = useRef<any>(null)

  const [splitterPosition, setSplitterPosition] = useState(50) // Percentage of height for editor
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startY = useRef(0)
  const startSplitterPosition = useRef(50)



  const handleDeploy = async () => {
    setLoading(true)
    setOutput('')
    try {
      // First compile the contract using the executor (this doesn't create transactions)
      const compiledContracts = await executor.compileSolidity(code)
      if (compiledContracts.length === 0) {
        setOutput(`❌ Compilation failed: No contracts found in the code`)
        return
      }

      // Get the first compiled contract
      const contract = compiledContracts[0]

      // If compilation is successful, publish deployment through Multisynq
      const deploymentData = {
        contractName: contract.contractName || 'UnnamedContract',
        bytecode: contract.bytecode,
        abi: contract.abi || [],
        from: "0x1234567890123456789012345678901234567890", // Default account
        sourceCode: code
      }

      console.log("CodeEditor: Publishing contract deployment through Multisynq:", {
        ...deploymentData,
        from: formatAddress(deploymentData.from)
      })
      publish('blockchain', 'deployContract', deploymentData)
      
      setOutput('🚀 Contract deployment submitted to blockchain!\n⏳ Transaction added to pending queue...\n💡 Click "Mine Block" in the status bar to process immediately, or wait up to 15 seconds for auto-mining.')
      
    } catch (error: any) {
      setOutput(
        `❌ Deployment failed: ${error.message || 'An error occurred while deploying the contract'}`,
      )
    } finally {
      setLoading(false)
    }
  }

  const handleRun = async () => {
    setLoading(true)
    setOutput('')
    try {
      // First compile the contract using the executor
      const compiledContracts = await executor.compileSolidity(code)
      if (compiledContracts.length === 0) {
        setOutput(`❌ Compilation failed: No contracts found in the code`)
        return
      }

      // Get the first compiled contract
      const contract = compiledContracts[0]

      // 1. First publish: Deploy the contract
      const deploymentData = {
        contractName: contract.contractName || 'UnnamedContract',
        bytecode: contract.bytecode,
        abi: contract.abi || [],
        from: "0x1234567890123456789012345678901234567890", // Default account
        sourceCode: code
      }

      console.log("CodeEditor: Publishing contract deployment through Multisynq:", {
        ...deploymentData,
        from: formatAddress(deploymentData.from)
      })
      publish('blockchain', 'deployContract', deploymentData)

      // 2. Second publish: Execute main function if it exists
      const mainFunction = contract.abi.find(
        (item: any) =>
          item.type === 'function' &&
          (item.name === 'main' || item.name === 'test' || item.name === 'run'),
      )

      if (mainFunction) {
        // Create execution request - let the model handle the transaction creation
        const executionData = {
          contractName: contract.contractName || 'UnnamedContract',
          functionName: mainFunction.name,
          functionArgs: [], // Empty args for main/test/run functions
          from: "0x1234567890123456789012345678901234567890",
          abi: contract.abi
        }

        console.log("CodeEditor: Publishing contract execution through Multisynq:", {
          ...executionData,
          from: formatAddress(executionData.from)
        })
        publish('blockchain', 'executeTransaction', executionData)
        
        setOutput(`🚀 Contract deployment & execution submitted to blockchain!\n⏳ Two publish events sent (deploy + execute)...\n💡 Click "Mine Block" in the status bar to process immediately, or wait up to 15 seconds for auto-mining.\n🔧 Main function "${mainFunction.name}" will be executed after deployment.`)
      } else {
        setOutput('🚀 Contract deployment submitted to blockchain!\n⏳ Deploy event published...\n💡 Click "Mine Block" in the status bar to process immediately, or wait up to 15 seconds for auto-mining.\n📝 No main function found to execute.')
      }
      
    } catch (error: any) {
      setOutput(
        `❌ Execution failed: ${error.message || 'An error occurred while deploying and executing the contract'}`,
      )
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setCode('')
    setOutput('')
  }

  // Resize editor when splitter position changes
  useEffect(() => {
    if (editorRef.current) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        editorRef.current.editor.resize()
      }, 100)
    }
  }, [splitterPosition])

  // Mouse event handlers for splitter
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return

    e.preventDefault()
    const rect = containerRef.current.getBoundingClientRect()
    const deltaY = e.clientY - startY.current
    const containerHeight = rect.height
    const deltaPercent = (deltaY / containerHeight) * 100
    const newPosition = startSplitterPosition.current + deltaPercent

    // Constrain between 20% and 80%
    const constrainedPosition = Math.min(Math.max(newPosition, 20), 80)
    setSplitterPosition(constrainedPosition)
  }, [])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      isDragging.current = true
      startY.current = e.clientY
      startSplitterPosition.current = splitterPosition
      document.body.style.cursor = 'ns-resize'
      document.body.style.userSelect = 'none'
    },
    [splitterPosition],
  )

  // Setup global mouse event listeners
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 100px)',
        width: '100%',
        p: 2,
      }}
    >
      <Typography variant="h6" gutterBottom>
        Solidity Code Editor
      </Typography>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-start' }}>
        <Button
          variant="contained"
          startIcon={<DeployIcon />}
          onClick={handleDeploy}
          disabled={loading}
          sx={{ mr: 1 }}
        >
          Deploy
        </Button>
        <Button variant="outlined" startIcon={<ClearIcon />} onClick={handleClear}>
          Clear
        </Button>
      </Box>
      <Box
        ref={containerRef}
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          width: '100%',
          minHeight: '400px',
        }}
      >
        {/* Editor Panel */}
        <Paper
          elevation={3}
          sx={{
            height: `${splitterPosition}%`,
            mb: 0,
            p: 2,
            overflow: 'hidden',
            width: '100%',
            minHeight: '150px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Code Editor
          </Typography>
          <Box sx={{ flexGrow: 1, minHeight: 0 }}>
            <AceEditor
              ref={editorRef}
              mode="text"
              theme="monokai"
              value={code}
              onChange={setCode}
              name="code-editor"
              editorProps={{ $blockScrolling: true }}
              style={{ width: '100%', height: '100%' }}
              fontSize={14}
              showPrintMargin={false}
              showGutter={true}
              highlightActiveLine={true}
              setOptions={{
                showLineNumbers: true,
                tabSize: 2,
                wrap: true,
                fontSize: 14,
              }}
            />
          </Box>
        </Paper>

        {/* Splitter */}
        <Box
          sx={{
            height: '8px',
            backgroundColor: 'primary.main',
            cursor: 'ns-resize',
            '&:hover': {
              backgroundColor: 'primary.dark',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            },
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              width: '30px',
              height: '3px',
              backgroundColor: 'white',
              borderRadius: '2px',
              opacity: 0.7,
            },
          }}
          onMouseDown={handleMouseDown}
        />

        {/* Output Panel */}
        <Paper
          elevation={3}
          sx={{
            height: `${100 - splitterPosition}%`,
            mt: 0,
            p: 2,
            overflow: 'auto',
            width: '100%',
            minHeight: '150px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Output
          </Typography>
          <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto' }}>
            {loading ? (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                }}
              >
                <CircularProgress />
              </Box>
            ) : (
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  lineHeight: 1.4,
                }}
              >
                {output ||
                  'No output yet.\n• "Deploy" - Deploys the contract to the blockchain.'}
              </Typography>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}
