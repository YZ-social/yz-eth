import {
  Box,
} from '@mui/material'
import React, { useRef } from 'react'
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
  setConsoleOutput: (output: string) => void
  setConsoleLoading: (loading: boolean) => void
}



export default function CodeEditor({ executor, blockManager, code, setCode, setConsoleOutput, setConsoleLoading }: CodeEditorProps) {
  const { publish } = useMultisynq()
  const editorRef = useRef<any>(null)







  const handleRun = async () => {
    setConsoleLoading(true)
    setConsoleOutput('')
    try {
      // First compile the contract using the executor
      const compiledContracts = await executor.compileSolidity(code)
      if (compiledContracts.length === 0) {
        setConsoleOutput(`❌ Compilation failed: No contracts found in the code`)
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
        
        setConsoleOutput(`🚀 Contract deployment & execution submitted to blockchain!\n⏳ Two publish events sent (deploy + execute)...\n💡 Click "Mine Block" in the status bar to process immediately, or wait up to 15 seconds for auto-mining.\n🔧 Main function "${mainFunction.name}" will be executed after deployment.`)
      } else {
        setConsoleOutput('🚀 Contract deployment submitted to blockchain!\n⏳ Deploy event published...\n💡 Click "Mine Block" in the status bar to process immediately, or wait up to 15 seconds for auto-mining.\n📝 No main function found to execute.')
      }
      
    } catch (error: any) {
      setConsoleOutput(
        `❌ Execution failed: ${error.message || 'An error occurred while deploying and executing the contract'}`,
      )
    } finally {
      setConsoleLoading(false)
    }
  }





  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
      }}
    >
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
  )
}
