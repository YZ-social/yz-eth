// BlockchainModel.js - Multisynq Model for Blockchain Simulation
// This is our proven model from multisynq-test.html, now as a separate module

// Wait for Multisynq to be available
if (typeof window !== 'undefined' && !window.Multisynq) {
    console.warn("BlockchainModel: Multisynq not yet available, model will initialize when loaded");
}

class BlockchainModel extends (window?.Multisynq?.Model || class {}) {
    init() {
        console.log("BlockchainModel: Initializing...");
        
        // Initialize blockchain state
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
        
        // Subscribe to blockchain events
        this.subscribe("blockchain", "createBlock", "createBlock");
        this.subscribe("blockchain", "executeTransaction", "executeTransaction");
        this.subscribe("blockchain", "deployContract", "deployContract");
        this.subscribe("compilation", "complete", "handleCompiledContract");
        
        // Create genesis block
        this.createGenesisBlock();
        
        // Start heartbeat counter (1 second intervals)
        this.future(1000).heartbeat();
        
        // Auto-mine blocks every 15 seconds
        this.future(15000).autoMineBlock();
        
        console.log("BlockchainModel: Initialized with genesis block");
    }

    createGenesisBlock() {
        const genesisBlock = {
            blockNumber: 0,
            timestamp: this.now(),
            parentHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
            hash: this.generateBlockHash(0, this.now(), "0x0000000000000000000000000000000000000000000000000000000000000000", []),
            transactions: [],
            miner: "genesis",
            nonce: 0
        };
        
        this.blocks.push(genesisBlock);
        this.publish("blockchain", "blockAdded", { block: genesisBlock, blockNumber: 0 });
    }

    createBlock(data = {}) {
        console.log("BlockchainModel: Creating new block...");
        
        const blockNumber = this.currentBlockNumber + 1;
        const parentHash = this.blocks[this.blocks.length - 1].hash;
        const timestamp = this.now();
        const transactions = [...this.pendingTransactions];
        
        // Execute all pending transactions
        transactions.forEach(tx => {
            this.executeTransactionInternal(tx);
        });
        
        const hash = this.generateBlockHash(blockNumber, timestamp, parentHash, transactions);
        
        const newBlock = {
            blockNumber,
            timestamp,
            parentHash,
            hash,
            transactions,
            miner: data.miner || "default_miner",
            nonce: Math.floor(Math.random() * 1000000)
        };
        
        this.blocks.push(newBlock);
        this.currentBlockNumber = blockNumber;
        this.pendingTransactions = []; // Clear pending transactions
        
        console.log(`BlockchainModel: Block ${blockNumber} created with ${transactions.length} transactions`);
        
        // Publish events
        this.publish("blockchain", "blockAdded", { 
            block: newBlock, 
            blockNumber,
            totalBlocks: this.blocks.length 
        });
        
        this.publish("blockchain", "tick", {
            blockNumber: this.currentBlockNumber,
            pendingTransactions: this.pendingTransactions.length,
            totalContracts: this.contracts.length
        });
    }

    executeTransaction(data) {
        console.log("BlockchainModel: Adding transaction to pending pool...", data);
        
        const transaction = {
            id: `tx_${this.now()}_${Math.random().toString(36).substr(2, 9)}`,
            from: data.from,
            to: data.to,
            value: BigInt(data.value || 0),
            type: data.type || 'eth_transfer',
            timestamp: this.now(),
            status: 'pending',
            data: data.data || null,
            gasUsed: data.gasUsed || 21000
        };
        
        this.pendingTransactions.push(transaction);
        
        this.publish("blockchain", "transactionAdded", { 
            transaction,
            pendingCount: this.pendingTransactions.length 
        });
        
        this.publish("blockchain", "tick", {
            blockNumber: this.currentBlockNumber,
            pendingTransactions: this.pendingTransactions.length,
            totalContracts: this.contracts.length
        });
    }

    executeTransactionInternal(transaction) {
        try {
            // Find accounts
            const fromAccount = this.accounts.find(acc => acc.address === transaction.from);
            const toAccount = this.accounts.find(acc => acc.address === transaction.to);
            
            if (transaction.type === 'eth_transfer') {
                if (fromAccount && fromAccount.balance >= transaction.value) {
                    fromAccount.balance -= transaction.value;
                    if (toAccount) {
                        toAccount.balance += transaction.value;
                    }
                    transaction.status = 'executed';
                    
                    this.publish("blockchain", "transactionExecuted", { 
                        transaction,
                        fromBalance: fromAccount.balance,
                        toBalance: toAccount?.balance
                    });
                } else {
                    transaction.status = 'failed';
                    this.publish("blockchain", "transactionFailed", { 
                        transaction,
                        reason: 'Insufficient balance'
                    });
                }
            } else {
                transaction.status = 'executed';
                this.publish("blockchain", "transactionExecuted", { transaction });
            }
        } catch (error) {
            transaction.status = 'failed';
            this.publish("blockchain", "transactionFailed", { 
                transaction,
                reason: error.message
            });
        }
    }

    deployContract(data) {
        console.log("BlockchainModel: Deploying contract...", data);
        
        try {
            const contractAddress = this.generateContractAddress();
            const contract = {
                name: data.contractName || 'UnknownContract',
                address: contractAddress,
                bytecode: data.bytecode || '',
                abi: data.abi || [],
                deployedAt: this.now(),
                deployedBy: data.deployedBy || 'unknown',
                isCompiled: !!data.bytecode,
                sessionTime: Math.floor(this.now() / 1000)
            };
            
            this.contracts.push(contract);
            
            // Create deployment transaction
            const deploymentTx = {
                id: `deploy_${this.now()}_${Math.random().toString(36).substr(2, 9)}`,
                from: data.deployedBy || 'unknown',
                to: contractAddress,
                value: BigInt(0),
                type: 'deployment',
                timestamp: this.now(),
                status: 'pending',
                data: {
                    contractName: contract.name,
                    bytecode: contract.bytecode,
                    abi: contract.abi
                },
                gasUsed: 500000
            };
            
            this.pendingTransactions.push(deploymentTx);
            
            console.log(`BlockchainModel: Contract ${contract.name} deployed at ${contractAddress}`);
            console.log(`BlockchainModel: Bytecode length: ${contract.bytecode.length} characters`);
            console.log(`BlockchainModel: Total contracts: ${this.contracts.length}`);
            
            this.publish("blockchain", "contractDeployed", { 
                contract,
                totalContracts: this.contracts.length
            });
            
            this.publish("blockchain", "tick", {
                blockNumber: this.currentBlockNumber,
                pendingTransactions: this.pendingTransactions.length,
                totalContracts: this.contracts.length
            });
            
        } catch (error) {
            console.error("BlockchainModel: Contract deployment failed:", error);
            this.publish("blockchain", "deploymentFailed", { 
                error: error.message,
                contractName: data.contractName
            });
        }
    }

    handleCompiledContract(data) {
        console.log("BlockchainModel: Received compiled contract", data);
        
        try {
            // Store compilation result for potential deployment
            const compilationResult = {
                contractName: data.contractName,
                bytecode: data.bytecode,
                abi: data.abi,
                metadata: data.metadata,
                compiledAt: this.now(),
                requestId: data.requestId
            };
            
            this.publish("contract", "readyForDeployment", compilationResult);
            
        } catch (error) {
            console.error("BlockchainModel: Error handling compiled contract:", error);
            this.publish("compilation", "error", { 
                error: error.message,
                contractName: data.contractName
            });
        }
    }

    heartbeat() {
        this.heartbeatCount++;
        
        const modelHash = this.calculateModelHash();
        
        this.publish("system", "heartbeat", {
            count: this.heartbeatCount,
            sessionTime: Math.floor(this.now() / 1000),
            modelHash: modelHash
        });
        
        // Schedule next heartbeat
        this.future(1000).heartbeat();
    }

    autoMineBlock() {
        if (this.pendingTransactions.length > 0) {
            console.log("BlockchainModel: Auto-mining block with pending transactions...");
            this.createBlock({ miner: "auto_miner" });
        }
        
        // Schedule next auto-mine
        this.future(15000).autoMineBlock();
    }

    calculateModelHash() {
        // Create a deterministic hash based on key model state
        const modelState = {
            blockCount: this.blocks.length,
            contractCount: this.contracts.length,
            accountBalances: this.accounts.map(acc => ({ 
                address: acc.address, 
                balance: acc.balance.toString() 
            })),
            pendingTxCount: this.pendingTransactions.length,
            currentBlockNumber: this.currentBlockNumber
        };
        
        const stateString = JSON.stringify(modelState);
        return this.simpleHash(stateString);
    }

    generateBlockHash(blockNumber, timestamp, parentHash, transactions) {
        const data = `${blockNumber}${timestamp}${parentHash}${JSON.stringify(transactions)}`;
        return "0x" + this.simpleHash(data);
    }

    generateContractAddress() {
        const timestamp = this.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `0x${this.simpleHash(timestamp + random).substring(0, 40)}`;
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16).padStart(8, '0');
    }

    // Getter methods for React components
    getBlocks() {
        return this.blocks;
    }

    getContracts() {
        return this.contracts;
    }

    getAccounts() {
        return this.accounts;
    }

    getPendingTransactions() {
        return this.pendingTransactions;
    }

    getCurrentBlockNumber() {
        return this.currentBlockNumber;
    }
}

// Register the model (exactly like Hello World and our test environment)
BlockchainModel.register("BlockchainModel");

// Export for both ES6 and CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BlockchainModel;
} else if (typeof window !== 'undefined') {
    window.BlockchainModel = BlockchainModel;
}

export default BlockchainModel; 