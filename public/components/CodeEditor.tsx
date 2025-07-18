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

interface CodeEditorProps {
  executor: SolidityExecutor
  blockManager: BlockManager
  code: string
  setCode: (code: string) => void
}



export default function CodeEditor({ executor, blockManager, code, setCode }: CodeEditorProps) {
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
      const result = await executor.deploySolidity(code)
      if (result.success) {
        let outputText = '✅ Deployment successful!\n'
        outputText += `📊 Gas used: ${result.gasUsed.toString()}\n`
        outputText += `📤 Output: ${result.output}\n`
        if (result.logs && result.logs.length > 0) {
          outputText += `📋 Logs:\n${result.logs.join('\n')}\n`
        }
        if (result.contractAddress) {
          outputText += `🏗️ Contract deployed at: ${result.contractAddress}\n`
          outputText += `💡 Go to Dashboard to execute contract functions.\n`
        }
        setOutput(outputText)
      } else {
        setOutput(`❌ Deployment failed: ${result.error}`)
      }
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
      const result = await executor.executeSolidity(code)
      if (result.success) {
        let outputText = '✅ Execution successful!\n'
        outputText += `📊 Gas used: ${result.gasUsed.toString()}\n`
        outputText += `📤 Output: ${result.output}\n`
        if (result.logs && result.logs.length > 0) {
          outputText += `📋 Logs:\n${result.logs.join('\n')}\n`
        }
        if (result.contractAddress) {
          outputText += `🏗️ Contract deployed at: ${result.contractAddress}\n`
        }
        setOutput(outputText)
      } else {
        setOutput(`❌ Execution failed: ${result.error}`)
      }
    } catch (error: any) {
      setOutput(
        `❌ Execution failed: ${error.message || 'An error occurred while executing the code'}`,
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
          Deploy Only
        </Button>
        <Button
          variant="outlined"
          startIcon={<PlayArrowIcon />}
          onClick={handleRun}
          disabled={loading}
          sx={{ mr: 1 }}
        >
          Deploy & Run
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
                  'No output yet.\n• "Deploy Only" - Just deploys the contract to the blockchain\n• "Deploy & Run" - Deploys and automatically runs main/test/run function if available'}
              </Typography>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}
