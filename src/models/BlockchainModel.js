// src/models/BlockchainModel.js
// Following Multisynq Hello World MyModel pattern for YZ-ETH Blockchain

class BlockchainModel extends Multisynq.Model {
    init() {
        console.log("BlockchainModel: Initializing...");
        console.log("Force a change 0001");
        // Initialize blockchain state (like Hello World's count = 0)
        this.blocks = [];
        this.accounts = [
            { address: "0x1234567890123456789012345678901234567890", balance: 1000n },
            { address: "0x2345678901234567890123456789012345678901", balance: 1000n },
            { address: "0x3456789012345678901234567890123456789012", balance: 1000n }
        ];
        this.contracts = [];
        this.currentBlockNumber = 0;
        this.pendingTransactions = [];
        this.heartbeatCount = 0;
        
        // Subscribe to blockchain events (like Hello World's counter reset)
        this.subscribe("blockchain", "createBlock", this.createBlock);
        this.subscribe("blockchain", "executeTransaction", this.executeTransaction);
        this.subscribe("blockchain", "deployContract", this.deployContract);
        this.subscribe("compilation", "complete", this.handleCompiledContract);
        
        // Create genesis block
        this.createGenesisBlock();
        
        // Start heartbeat counter (1 second intervals)
        this.future(1000).heartbeat();
        
        // Auto-mine blocks every 10 seconds (like Hello World's tick)
        this.future(10000).autoMineBlock();
        
        console.log("BlockchainModel: Initialized with genesis block");
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
        this.pendingTransactions = []; // Clear pending transactions
        
        console.log(`BlockchainModel: Block ${newBlock.number} created with ${newBlock.transactions.length} transactions`);
        
        // Publish event (like Hello World's publish counter changed)
        this.publish("blockchain", "blockAdded", { 
            block: newBlock,
            totalBlocks: this.blocks.length 
        });
    }
    
    executeTransaction(transactionData) {
        console.log("BlockchainModel: Executing transaction...", transactionData);
        
        try {
            // Simple transaction execution (transfer ETH)
            const { from, to, value } = transactionData;
            
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
                timestamp: this.now() // Use Multisynq deterministic time
            };
            
            // Add to pending transactions
            this.pendingTransactions.push(transaction);
            
            console.log("BlockchainModel: Transaction executed successfully");
            
            // Publish transaction executed event
            this.publish("blockchain", "transactionExecuted", { 
                transaction,
                fromBalance: fromAccount.balance.toString(),
                toBalance: toAccount.balance.toString()
            });
            
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
            const { bytecode, abi, contractName, from } = contractData;
            
            // Generate contract address
            const contractAddress = this.generateContractAddress();
            
            // Create contract instance
            const contract = {
                address: contractAddress,
                name: contractName,
                bytecode,
                abi,
                deployedBy: from,
                deployedAt: this.now() // Use Multisynq deterministic time
            };
            
            this.contracts.push(contract);
            
            // Create deployment transaction
            const transaction = {
                hash: this.generateTransactionHash(),
                from,
                to: contractAddress,
                value: "0",
                data: bytecode,
                status: "success",
                type: "contract_deployment",
                timestamp: this.now() // Use Multisynq deterministic time
            };
            
            this.pendingTransactions.push(transaction);
            
            console.log(`BlockchainModel: Contract ${contractName} deployed at ${contractAddress}`);
            
            this.publish("blockchain", "contractDeployed", { 
                contract,
                transaction 
            });
            
        } catch (error) {
            console.error("BlockchainModel: Contract deployment failed:", error.message);
            
            this.publish("blockchain", "deploymentFailed", { 
                error: error.message,
                contractData 
            });
        }
    }
    
    handleCompiledContract(compilationData) {
        // Receive compiled contract from CompilationManager
        console.log("BlockchainModel: Received compiled contract", compilationData);
        
        const { bytecode, abi, contractName } = compilationData;
        
        // Store compiled contract (ready for deployment)
        this.publish("contract", "readyForDeployment", { 
            contractName,
            bytecode,
            abi,
            canDeploy: true
        });
    }
    
    heartbeat() {
        // Increment heartbeat counter
        this.heartbeatCount++;
        
        // Calculate model hash for synchronization verification
        const modelState = {
            blocks: this.blocks.length,
            pendingTx: this.pendingTransactions.length,
            contracts: this.contracts.length,
            balances: this.accounts.map(acc => acc.balance.toString())
        };
        
        const modelHash = this.calculateModelHash(modelState);
        
        // Publish heartbeat with synchronization data
        this.publish("system", "heartbeat", {
            count: this.heartbeatCount,
            modelHash: modelHash,
            timestamp: this.now()
        });
        
        // Schedule next heartbeat
        this.future(1000).heartbeat();
    }
    
    autoMineBlock() {
        // Auto-mine blocks with pending transactions (like Hello World's tick)
        if (this.pendingTransactions.length > 0) {
            console.log(`BlockchainModel: Auto-mining block with ${this.pendingTransactions.length} pending transactions`);
            this.createBlock();
        }
        
        // Publish blockchain status (like Hello World's tick publish)
        this.publish("blockchain", "tick", { 
            blockNumber: this.currentBlockNumber,
            pendingTransactions: this.pendingTransactions.length,
            timestamp: this.now() // Use Multisynq deterministic time
        });
        
        // Schedule next auto-mine (like Hello World's future tick)
        this.future(10000).autoMineBlock();
    }
    
    // Utility methods
    generateBlockHash() {
        return "0x" + Math.random().toString(16).substr(2, 64).padStart(64, '0');
    }
    
    generateTransactionHash() {
        return "0x" + Math.random().toString(16).substr(2, 64).padStart(64, '0');
    }
    
    generateContractAddress() {
        return "0x" + Math.random().toString(16).substr(2, 40).padStart(40, '0');
    }
    
    calculateModelHash(modelState) {
        // Simple hash calculation for synchronization verification
        const stateString = JSON.stringify(modelState);
        let hash = 0;
        for (let i = 0; i < stateString.length; i++) {
            const char = stateString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16).padStart(8, '0');
    }
    
    getLastBlock() {
        return this.blocks[this.blocks.length - 1];
    }
    
    // Getter methods for view access (read-only)
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
}

// Register the model (exactly like Hello World)
BlockchainModel.register("BlockchainModel"); 