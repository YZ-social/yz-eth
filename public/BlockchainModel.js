// Exact copy of the working BlockchainModel from multisynq-test.html
class BlockchainModel extends Multisynq.Model {
    init() {
        console.log("BlockchainModel: Initializing...");
        
        // Initialize blockchain state
        this.blocks = [];
        
        // Initialize other state
        this.accounts = [
            { address: "0x1234567890123456789012345678901234567890", balance: BigInt("10000000000000000000000") },
            { address: "0x2345678901234567890123456789012345678901", balance: BigInt("10000000000000000000000") },
            { address: "0x3456789012345678901234567890123456789012", balance: BigInt("10000000000000000000000") }
        ];
        this.pendingTransactions = [];
        // Generate account_creation transactions for initial accounts
        for (const account of this.accounts) {
            this.pendingTransactions.push({
                hash: this.generateTransactionHash(),
                from: "0x0000000000000000000000000000000000000000",
                to: account.address,
                value: account.balance.toString(),
                data: "",
                type: "account_creation",
                status: "success",
                timestamp: this.now(),
                gasUsed: BigInt(21000),
                gasPrice: BigInt(20000000000)
            });
        }
        this.contracts = [];
        this.compiledContracts = [];
        this.currentBlockNumber = 0;
        this.heartbeatCount = 0;
        
        // Subscribe to blockchain events
        this.subscribe("blockchain", "createBlock", this.createBlock);
        this.subscribe("blockchain", "executeTransaction", this.executeTransaction);
        this.subscribe("blockchain", "deployContract", this.deployContract);
        this.subscribe("blockchain", "createAccount", this.createAccount);
        this.subscribe("blockchain", "requestState", this.handleStateRequest);
        this.subscribe("compilation", "complete", this.handleCompiledContract);
        
        // Note: Compilation is handled externally by CompilationManager
        // Results are published to the model via View
        
        // Create genesis block
        this.createGenesisBlock();
        // Mine initial account creation transactions into the first block
        if (this.pendingTransactions.length > 0) {
            this.createBlock();
        }
        
        // Start heartbeat counter (1 second intervals)
        this.future(1000).heartbeat();
        
        // Auto-mine blocks every 15 seconds
        this.future(15000).autoMineBlock();
        
        console.log("BlockchainModel: Initialized with genesis block and accounts");
    }
    
    // Utility functions for formatting hex values
    formatAddress(address) {
        if (!address || typeof address !== 'string' || !address.startsWith('0x')) {
            return address || 'N/A';
        }
        const hexPart = address.slice(2);
        if (hexPart.length <= 8) return address;
        return `0x0...${hexPart.slice(-5)}`;
    }
    
    formatHash(hash) {
        if (!hash || typeof hash !== 'string' || !hash.startsWith('0x')) {
            return hash || 'N/A';
        }
        const hexPart = hash.slice(2);
        if (hexPart.length <= 8) return hash;
        return `0x0...${hexPart.slice(-5)}`;
    }
    
    createGenesisBlock() {
        const genesisBlock = {
            number: 0,
            transactions: [],
            timestamp: this.now(), // Use Multisynq deterministic time
            hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
            parentHash: "0x0000000000000000000000000000000000000000000000000000000000000000"
        };
        
        this.blocks.push(genesisBlock);
        this.publish("blockchain", "blockAdded", { 
            block: genesisBlock,
            isGenesis: true 
        });
    }
    
    createBlock() {
        console.log("BlockchainModel: Creating new block...");
        
        // Create new block (like Hello World's resetCounter)
        const newBlock = {
            number: this.currentBlockNumber + 1,
            transactions: [...this.pendingTransactions],
            timestamp: this.now(), // Use Multisynq deterministic time
            hash: this.generateBlockHash(),
            parentHash: this.getLastBlock().hash
        };
        
        this.blocks.push(newBlock);
        this.currentBlockNumber++;
        const clearedTransactions = [...this.pendingTransactions]; // Save reference before clearing
        this.pendingTransactions = []; // Clear pending transactions
        
        console.log(`BlockchainModel: Block ${newBlock.number} created with ${newBlock.transactions.length} transactions`);
        
        // Publish event with detailed transaction info
        this.publish("blockchain", "blockAdded", { 
            block: newBlock,
            totalBlocks: this.blocks.length,
            transactionsIncluded: clearedTransactions.length,
            blockPosition: this.blocks.length - 1
        });
    }
    
    executeTransaction(transactionData) {
        console.log("BlockchainModel: Executing transaction...", transactionData);
        
        try {
            const { from, to, value, type, contractName, functionName, gasUsed } = transactionData;
            
            if (contractName && functionName) {
                // Handle contract function execution request
                console.log(`BlockchainModel: Processing function execution request for ${contractName}.${functionName}`);
                
                // Find the deployed contract by name
                const deployedContract = this.contracts.find(contract => contract.name === contractName);
                if (!deployedContract) {
                    throw new Error(`Contract ${contractName} not found in deployed contracts`);
                }
                
                console.log(`BlockchainModel: Found contract ${contractName} at address ${this.formatAddress(deployedContract.address)}`);
                
                // Create transaction record for contract function execution with REAL gas usage
                const transaction = {
                    hash: this.generateTransactionHash(),
                    from: from || "0x1234567890123456789012345678901234567890",
                    to: deployedContract.address,
                    value: value || "0",
                    data: `${functionName}()`, // Simplified function call representation
                    status: "success",
                    type: "contract_execution",
                    contractName: contractName, // Add contract name for display
                    functionName: functionName, // Add function name for display
                    timestamp: this.now(), // Use Multisynq deterministic time
                    gasUsed: gasUsed || 21000 // Use REAL gas from VM execution
                };
                
                // Add to pending transactions
                this.pendingTransactions.push(transaction);
                
                console.log(`BlockchainModel: Contract function execution transaction created for ${contractName}.${functionName}`);
                
                // Publish transaction executed event with position info
                this.publish("blockchain", "transactionExecuted", { 
                    transaction,
                    contractName,
                    functionName,
                    contractAddress: deployedContract.address,
                    executionResult: `${functionName}() executed successfully`,
                    pendingPosition: this.pendingTransactions.length - 1,
                    totalPending: this.pendingTransactions.length
                });
                
            } else if (type === "contract_execution") {
                // Handle legacy contract execution format (for backward compatibility)
                const { contractName, functionName, functionArgs, abi } = transactionData;
                
                console.log(`BlockchainModel: Executing function ${functionName} on contract ${contractName} (legacy format)`);
                
                // Create transaction record for contract execution
                const transaction = {
                    hash: this.generateTransactionHash(),
                    from,
                    to,
                    value: value || "0",
                    data: `${functionName}(${functionArgs ? functionArgs.join(',') : ''})`,
                    status: "success",
                    type: "contract_execution",
                    timestamp: this.now() // Use Multisynq deterministic time
                };
                
                // Add to pending transactions
                this.pendingTransactions.push(transaction);
                
                console.log(`BlockchainModel: Contract function execution transaction created (legacy)`);
                
                // Publish transaction executed event with position info
                this.publish("blockchain", "transactionExecuted", { 
                    transaction,
                    executionResult: "Function executed successfully", // Simplified result
                    pendingPosition: this.pendingTransactions.length - 1,
                    totalPending: this.pendingTransactions.length
                });
                
            } else {
                // Handle simple ETH transfer
                // Find accounts
                const fromAccount = this.accounts.find(acc => acc.address === from);
                const toAccount = this.accounts.find(acc => acc.address === to);
                
                if (!fromAccount || !toAccount) {
                    throw new Error("Account not found");
                }
                
                if (fromAccount.balance < BigInt(value)) {
                    throw new Error("Insufficient balance");
                }
                
                // Execute transfer
                fromAccount.balance -= BigInt(value);
                toAccount.balance += BigInt(value);
                
                // Create transaction record
                const transaction = {
                    hash: this.generateTransactionHash(),
                    from,
                    to,
                    value,
                    status: "success",
                    type: "eth_transfer",
                    timestamp: this.now() // Use Multisynq deterministic time
                };
                
                // Add to pending transactions
                this.pendingTransactions.push(transaction);
                
                console.log("BlockchainModel: ETH transfer transaction executed successfully");
                
                // Publish transaction executed event with position info
                this.publish("blockchain", "transactionExecuted", { 
                    transaction,
                    fromBalance: fromAccount.balance.toString(),
                    toBalance: toAccount.balance.toString(),
                    pendingPosition: this.pendingTransactions.length - 1,
                    totalPending: this.pendingTransactions.length
                });
            }
            
        } catch (error) {
            console.error("BlockchainModel: Transaction failed:", error.message);
            
            this.publish("blockchain", "transactionFailed", { 
                error: error.message,
                transactionData 
            });
        }
    }
    
    deployContract(contractData) {
        console.log("BlockchainModel: Deploying contract...", contractData);
        
        try {
            const { contractName, bytecode, abi, from, gasUsed } = contractData;
            
            // Generate contract address (simplified)
            const contractAddress = this.generateContractAddress();
            
            // Create deployed contract record
            const deployedContract = {
                name: contractName,
                address: contractAddress,
                bytecode,
                abi: abi || [],
                deployer: from,
                deployedAt: this.now(), // Use Multisynq deterministic time
                transactionHash: this.generateTransactionHash()
            };
            
            this.contracts.push(deployedContract);
            
            // Create deployment transaction with REAL gas usage
            const transaction = {
                hash: deployedContract.transactionHash,
                from: from,
                to: contractAddress,
                value: "0",
                data: bytecode.substring(0, 50) + "...", // Truncate for display
                status: "success",
                type: "contract_deployment",
                contractName: contractName, // Add contract name for display
                timestamp: this.now(), // Use Multisynq deterministic time
                gasUsed: gasUsed || 21000 // Use REAL gas from VM execution
            };
            
            this.pendingTransactions.push(transaction);
            
            console.log(`BlockchainModel: Contract ${contractName} deployed at ${this.formatAddress(contractAddress)}`);
            console.log(`BlockchainModel: Bytecode length: ${bytecode.length} characters`);
            console.log(`BlockchainModel: Total contracts: ${this.contracts.length}`);
            
            this.publish("blockchain", "contractDeployed", { 
                contract: deployedContract,
                transaction,
                pendingPosition: this.pendingTransactions.length - 1,
                totalPending: this.pendingTransactions.length
            });
            
        } catch (error) {
            console.error("BlockchainModel: Contract deployment failed:", error.message);
            
            this.publish("blockchain", "deploymentFailed", { 
                error: error.message,
                contractData 
            });
        }
    }

    
    handleCompilationSuccess(compilationData) {
        // This method should NOT exist! 
        // External events should go through the View, not directly to the Model
        console.error("BlockchainModel: handleCompilationSuccess should not be called directly!");
    }
    
    handleCompilationError(errorData) {
        // This method should NOT exist! 
        // External events should go through the View, not directly to the Model
        console.error("BlockchainModel: handleCompilationError should not be called directly!");
    }
    
    handleCompiledContract(compilationData) {
        console.log("BlockchainModel: Compiled contract received", compilationData);
        
        // Store compiled contract info (ready for deployment)
        const contractInfo = {
            contractName: compilationData.contractName,
            bytecode: compilationData.bytecode,
            abi: compilationData.abi || [],
            metadata: compilationData.metadata || {},
            compiledAt: this.now() // Use deterministic time
        };
        
        console.log("BlockchainModel: Contract ready for deployment:", contractInfo.contractName);
        
        // Publish contract ready event
        this.publish("contract", "readyForDeployment", contractInfo);
    }
    
    handleStateRequest(data) {
        console.log("BlockchainModel: State requested, publishing current state");
        
        // Publish current state via blockchain:stateUpdate event
        const currentState = {
            blocks: this.blocks,
            accounts: this.accounts,
            contracts: this.contracts,
            pendingTransactions: this.pendingTransactions,
            currentBlockNumber: this.currentBlockNumber,
            heartbeatCount: this.heartbeatCount
        };
        
        this.publish("blockchain", "stateUpdate", currentState);
    }
    
    // Auto-mining functionality (runs every 15 seconds)
    autoMineBlock() {
        if (this.pendingTransactions.length > 0) {
            console.log("BlockchainModel: Auto-mining block with pending transactions...");
            this.createBlock();
        }
        
        // Schedule next auto-mine
        this.future(15000).autoMineBlock();
    }
    
    // Heartbeat counter (runs every 1 second, like Hello World's tick)
    heartbeat() {
        this.heartbeatCount++;
        
        // Publish heartbeat for UI updates
        this.publish("system", "heartbeat", { 
            count: this.heartbeatCount,
            timestamp: this.now()
        });
        
        // Publish blockchain tick with useful info
        this.publish("blockchain", "tick", {
            count: this.heartbeatCount,
            blockNumber: this.currentBlockNumber,
            pendingTransactions: this.pendingTransactions.length,
            totalContracts: this.contracts.length,
            timestamp: this.now()
        });
        
        // Schedule next heartbeat (every 1 second)
        this.future(1000).heartbeat();
    }
    
    // Utility methods
    getLastBlock() {
        return this.blocks[this.blocks.length - 1];
    }
    
    generateBlockHash() {
        // Simple hash generation (in real blockchain, this would be much more complex)
        const data = `${this.currentBlockNumber}-${this.now()}-${this.pendingTransactions.length}`;
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`;
    }
    
    generateTransactionHash() {
        // Simple transaction hash generation
        const data = `tx-${this.now()}-${Math.random()}`;
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`;
    }
    
    generateContractAddress() {
        // Simple contract address generation
        const data = `contract-${this.now()}-${this.contracts.length}`;
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `0x${Math.abs(hash).toString(16).padStart(40, '0')}`;
    }
    
    createAccount(accountData) {
        console.log("BlockchainModel: Creating new account:", accountData);
        
        const { balance, type } = accountData;
        
        // Generate new account address
        const newAddress = this.generateAccountAddress();
        
        // Create new account with balance (convert string to BigInt)
        const newAccount = {
            address: newAddress,
            balance: BigInt(balance || "1000000000000000000") // Default 1 ETH if not specified
        };
        
        // Add to accounts array
        this.accounts.push(newAccount);
        
        // Create transaction record for account creation
        const transaction = {
            hash: this.generateTransactionHash(),
            from: "0x0000000000000000000000000000000000000000", // System account
            to: newAddress,
            value: balance || "1000000000000000000",
            data: "",
            type: "account_creation",
            status: "success",
            timestamp: this.now(),
            gasUsed: BigInt(21000),
            gasPrice: BigInt(20000000000) // 20 gwei
        };
        
        // Add to pending transactions
        this.pendingTransactions.push(transaction);
        
        console.log(`BlockchainModel: Account ${this.formatAddress(newAddress)} created with balance ${balance} wei`);
        
        // Publish state update to all Views
    }
    
    generateAccountAddress() {
        // Simple account address generation
        const data = `account-${this.now()}-${this.accounts.length}`;
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `0x${Math.abs(hash).toString(16).padStart(40, '0')}`;
    }
    
    // Getter methods for the View to access data (like Hello World's getCounter)
    getBlocks() {
        return this.blocks;
    }
    
    getAccounts() {
        return this.accounts;
    }
    
    getContracts() {
        return this.contracts;
    }
    
    getPendingTransactions() {
        return this.pendingTransactions;
    }
    
    getCurrentBlockNumber() {
        return this.currentBlockNumber;
    }
    
    getHeartbeatCount() {
        return this.heartbeatCount;
    }
}

BlockchainModel.register("BlockchainModel", BlockchainModel);

// Register the model class (exactly like Hello World)
if (typeof Multisynq !== 'undefined' && Multisynq.Model) {
    // Check if already loaded to prevent duplicate definitions
    if (!window.blockchainModelLoaded) {
        // Register the model (like Hello World: CounterModel.register("CounterModel"))
        BlockchainModel.register("BlockchainModel", BlockchainModel);
        
        // Make it available globally for React
        window.BlockchainModel = BlockchainModel;
        
        window.blockchainModelLoaded = true;
        console.log("BlockchainModel: Class defined, registered, and made available globally");
    } else {
        console.log("BlockchainModel: Already loaded, skipping");
    }
} else {
    console.error("BlockchainModel: Multisynq not available");
} 