// src/services/CompilationManager.js
// Handles Solidity compilation outside the Multisynq model
// Compiles locally and publishes deterministic results to all users

class CompilationManager {
    constructor() {
        console.log("CompilationManager: Initializing...");
        
        this.worker = null;
        this.pendingCompilations = new Map(); // Track compilation requests
        this.compilationId = 0; // Unique ID for each compilation
        
        this.initializeWorker();
        this.setupGlobalEventListeners();
        
        console.log("CompilationManager: Ready for compilation requests");
    }
    
    initializeWorker() {
        try {
            // Initialize the existing Solidity web worker
            this.worker = new Worker('./src/solc-worker.js');
            
            // Set up worker message handler
            this.worker.onmessage = (event) => {
                this.handleWorkerMessage(event);
            };
            
            // Set up worker error handler
            this.worker.onerror = (error) => {
                console.error("CompilationManager: Worker error:", error);
                this.publishCompilationError("Worker initialization failed", null);
            };
            
            console.log("CompilationManager: Web worker initialized successfully");
            
        } catch (error) {
            console.error("CompilationManager: Failed to initialize worker:", error);
            this.publishCompilationError("Failed to initialize compilation worker", null);
        }
    }
    
    setupGlobalEventListeners() {
        // Listen for compilation requests from any source
        // This allows UI components to request compilation without direct coupling
        window.addEventListener('compile-solidity', (event) => {
            const { sourceCode, contractName, requestId } = event.detail;
            this.compileContract(sourceCode, contractName, requestId);
        });
        
        console.log("CompilationManager: Global event listeners set up");
    }
    
    // Public method for requesting compilation
    requestCompilation(sourceCode, contractName) {
        const requestId = `compile_${this.compilationId++}_${Date.now()}`;
        
        console.log(`CompilationManager: Compilation requested - ${contractName} (${requestId})`);
        
        // Dispatch global event for loose coupling
        const event = new CustomEvent('compile-solidity', {
            detail: { sourceCode, contractName, requestId }
        });
        window.dispatchEvent(event);
        
        return requestId;
    }
    
    compileContract(sourceCode, contractName, requestId) {
        if (!this.worker) {
            console.error("CompilationManager: Worker not available");
            this.publishCompilationError("Compilation worker not available", requestId);
            return;
        }
        
        console.log(`CompilationManager: Starting compilation - ${contractName}`);
        
        // Store compilation request for tracking
        this.pendingCompilations.set(requestId, {
            contractName,
            sourceCode,
            startTime: Date.now(),
            requestId
        });
        
        // Publish compilation started event
        this.publishCompilationStarted(contractName, requestId);
        
        // Prepare compilation input for solc
        const solcInput = {
            language: 'Solidity',
            sources: {
                [contractName]: {
                    content: sourceCode
                }
            },
            settings: {
                outputSelection: {
                    '*': {
                        '*': ['*']
                    }
                }
            }
        };
        
        // Send to web worker
        this.worker.postMessage({
            type: 'compile',
            input: solcInput,
            contractName: contractName,
            requestId: requestId
        });
    }
    
    handleWorkerMessage(event) {
        const { type, success, output, error, contractName, requestId } = event.data;
        
        if (type === 'compileResult') {
            this.handleCompileResult(success, output, error, contractName, requestId);
        } else if (type === 'error') {
            console.error("CompilationManager: Worker error:", error);
            this.publishCompilationError(error || "Unknown worker error", requestId);
        } else if (type === 'ready') {
            console.log("CompilationManager: Worker ready");
        } else if (type === 'versionResult') {
            console.log("CompilationManager: Solc version:", event.data.version);
        } else {
            console.warn("CompilationManager: Unknown worker message type:", type, event.data);
        }
    }
    
    handleCompileResult(success, output, error, contractName, requestId) {
        const compilation = this.pendingCompilations.get(requestId);
        
        if (!compilation) {
            console.warn(`CompilationManager: Received result for unknown compilation: ${requestId}`);
            return;
        }
        
        // Remove from pending
        this.pendingCompilations.delete(requestId);
        
        const compilationTime = Date.now() - compilation.startTime;
        
        if (!success || error) {
            console.error(`CompilationManager: Compilation failed - ${contractName}:`, error);
            this.publishCompilationError(error || "Unknown compilation error", requestId);
            return;
        }
        
        try {
            // Extract compilation results
            const result = this.extractCompilationResults(output, contractName);
            
            if (!result) {
                console.error(`CompilationManager: No valid compilation output for ${contractName}`);
                this.publishCompilationError("No valid compilation output generated", requestId);
                return;
            }
            
            console.log(`CompilationManager: Compilation successful - ${contractName} (${compilationTime}ms)`);
            
            // Publish successful compilation results to Multisynq model
            this.publishCompilationSuccess(result, requestId);
            
        } catch (extractError) {
            console.error(`CompilationManager: Failed to extract results for ${contractName}:`, extractError);
            this.publishCompilationError("Failed to extract compilation results", requestId);
        }
    }
    
    extractCompilationResults(output, contractName) {
        try {
            // Navigate the solc output structure to extract bytecode and ABI
            const contracts = output.contracts;
            
            if (!contracts || !contracts[contractName]) {
                console.error("CompilationManager: No contracts found in compilation output");
                return null;
            }
            
            const contractData = contracts[contractName];
            const firstContract = Object.keys(contractData)[0];
            
            if (!firstContract) {
                console.error("CompilationManager: No contract found in compilation output");
                return null;
            }
            
            const contract = contractData[firstContract];
            
            if (!contract.evm || !contract.evm.bytecode) {
                console.error("CompilationManager: No bytecode found in compilation output");
                return null;
            }
            
            const result = {
                contractName: firstContract,
                bytecode: contract.evm.bytecode.object,
                abi: contract.abi || [],
                metadata: {
                    compiler: output.contracts ? "solc" : "unknown",
                    compiledAt: Date.now(),
                    sourceHash: this.calculateSourceHash(contractName)
                }
            };
            
            console.log("CompilationManager: Extracted compilation results:", {
                contractName: result.contractName,
                bytecodeLength: result.bytecode.length,
                abiLength: result.abi.length
            });
            
            return result;
            
        } catch (error) {
            console.error("CompilationManager: Error extracting compilation results:", error);
            return null;
        }
    }
    
    calculateSourceHash(sourceCode) {
        // Simple hash for source code identification
        let hash = 0;
        for (let i = 0; i < sourceCode.length; i++) {
            const char = sourceCode.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16).padStart(8, '0');
    }
    
    // Event publishing methods - these will be picked up by Multisynq event listeners
    publishCompilationStarted(contractName, requestId) {
        const event = new CustomEvent('compilation-started', {
            detail: {
                contractName,
                requestId,
                timestamp: Date.now()
            }
        });
        window.dispatchEvent(event);
    }
    
    publishCompilationSuccess(result, requestId) {
        const event = new CustomEvent('compilation-success', {
            detail: {
                ...result,
                requestId,
                timestamp: Date.now(),
                success: true
            }
        });
        window.dispatchEvent(event);
        
        console.log(`CompilationManager: Published successful compilation for ${result.contractName}`);
    }
    
    publishCompilationError(error, requestId) {
        const event = new CustomEvent('compilation-error', {
            detail: {
                error,
                requestId,
                timestamp: Date.now(),
                success: false
            }
        });
        window.dispatchEvent(event);
        
        console.error("CompilationManager: Published compilation error:", error);
    }
    
    // Utility methods
    getPendingCompilations() {
        return Array.from(this.pendingCompilations.values());
    }
    
    isCompiling() {
        return this.pendingCompilations.size > 0;
    }
    
    terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.pendingCompilations.clear();
        console.log("CompilationManager: Terminated");
    }
}

// Create global compilation manager instance
// This ensures compilation services are available throughout the application
if (typeof window !== 'undefined') {
    window.compilationManager = new CompilationManager();
    console.log("CompilationManager: Global instance created");
} 