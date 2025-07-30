// src/views/BlockchainView.js
// Following Multisynq Hello World MyView pattern for YZ-ETH Blockchain

class BlockchainView extends Multisynq.View {
    constructor(model) {
        super(model);
        this.model = model;
        
        console.log("BlockchainView: Initializing...");
        
        // Set up UI event handlers (like Hello World's onclick)
        this.setupEventHandlers();
        
        // Subscribe to model changes (like Hello World's counter changed)
        this.subscribe("blockchain", "blockAdded", this.blockAdded);
        this.subscribe("blockchain", "transactionExecuted", this.transactionExecuted);
        this.subscribe("blockchain", "transactionFailed", this.transactionFailed);
        this.subscribe("blockchain", "contractDeployed", this.contractDeployed);
        this.subscribe("blockchain", "tick", this.blockchainTick);
        this.subscribe("contract", "readyForDeployment", this.contractReady);
        
        // Initial display update (like Hello World's initial counterChanged call)
        this.updateDisplay();
        
        // Load existing blockchain history for new participants
        this.loadExistingBlockchainHistory();
        
        console.log("BlockchainView: Initialized and ready");
    }
    
    setupEventHandlers() {
        // Set up button event handlers (like Hello World's countDisplay.onclick)
        const createBlockBtn = document.getElementById('createBlockBtn');
        const sendTransactionBtn = document.getElementById('sendTransactionBtn');
        const deployContractBtn = document.getElementById('deployContractBtn');
        
        if (createBlockBtn) {
            createBlockBtn.onclick = () => this.createBlock();
        }
        
        if (sendTransactionBtn) {
            sendTransactionBtn.onclick = () => this.sendTransaction();
        }
        
        if (deployContractBtn) {
            deployContractBtn.onclick = () => this.deployContract();
        }
    }
    
    createBlock() {
        // Publish event to model (like Hello World's counterReset)
        console.log("BlockchainView: User requested block creation");
        this.publish("blockchain", "createBlock");
    }
    
    sendTransaction() {
        // Get transaction data from UI
        const fromSelect = document.getElementById('fromAccount');
        const toSelect = document.getElementById('toAccount');
        const valueInput = document.getElementById('transactionValue');
        
        if (!fromSelect || !toSelect || !valueInput) {
            console.error("BlockchainView: Transaction form elements not found");
            return;
        }
        
        const transactionData = {
            from: fromSelect.value,
            to: toSelect.value,
            value: valueInput.value || "10"
        };
        
        console.log("BlockchainView: User requested transaction", transactionData);
        
        // Publish to model (Hello World publish pattern)
        this.publish("blockchain", "executeTransaction", transactionData);
    }
    
    deployContract() {
        // Simple contract deployment test
        const contractData = {
            contractName: "TestContract",
            bytecode: "0x608060405234801561001057600080fd5b50600080fd5b00",
            abi: [],
            from: this.model.getAccounts()[0].address
        };
        
        console.log("BlockchainView: User requested contract deployment");
        
        this.publish("blockchain", "deployContract", contractData);
    }
    
    // Event handlers for model changes (like Hello World's counterChanged)
    blockAdded(data) {
        console.log("BlockchainView: Block added", data);
        this.updateBlocksList(data.block);
        this.updateDisplay();
    }
    
    transactionExecuted(data) {
        console.log("BlockchainView: Transaction executed", data);
        this.updateTransactionsList(data.transaction);
        this.updateAccountBalances();
        this.updateDisplay();
    }
    
    transactionFailed(data) {
        console.log("BlockchainView: Transaction failed", data);
        this.showError(`Transaction failed: ${data.error}`);
    }
    
    contractDeployed(data) {
        console.log("BlockchainView: Contract deployed", data);
        this.updateContractsList(data.contract);
        this.updateDisplay();
    }
    
    contractReady(data) {
        console.log("BlockchainView: Contract ready for deployment", data);
        this.showContractReady(data.contractName);
    }
    
    blockchainTick(data) {
        // Update heartbeat display (like Hello World's tick)
        const tickElement = document.getElementById('blockchainTick');
        if (tickElement) {
            tickElement.textContent = `Block: ${data.blockNumber} | Pending: ${data.pendingTransactions}`;
        }
    }
    
    // UI Update methods (like Hello World's counterChanged)
    updateDisplay() {
        this.updateBlockCount();
        this.updateAccountBalances();
        this.updateContractCount();
        this.updatePendingTransactions();
    }
    
    updateBlockCount() {
        const blockCountElement = document.getElementById('blockCount');
        if (blockCountElement) {
            blockCountElement.textContent = this.model.getBlocks().length;
        }
    }
    
    updateAccountBalances() {
        const accounts = this.model.getAccounts();
        accounts.forEach((account, index) => {
            const balanceElement = document.getElementById(`balance${index}`);
            if (balanceElement) {
                balanceElement.textContent = `${account.balance.toString()} ETH`;
            }
        });
    }
    
    updateContractCount() {
        const contractCountElement = document.getElementById('contractCount');
        if (contractCountElement) {
            contractCountElement.textContent = this.model.getContracts().length;
        }
    }
    
    updatePendingTransactions() {
        const pendingElement = document.getElementById('pendingTransactions');
        if (pendingElement) {
            pendingElement.textContent = this.model.getPendingTransactions().length;
        }
    }
    
    updateBlocksList(block) {
        const blocksListElement = document.getElementById('blocksList');
        if (blocksListElement) {
            const blockDiv = document.createElement('div');
            blockDiv.className = 'block-item';
            blockDiv.innerHTML = `
                <strong>Block ${block.number}</strong><br>
                Hash: ${block.hash.substring(0, 10)}...<br>
                Transactions: ${block.transactions.length}<br>
                Time: ${new Date(block.timestamp).toLocaleTimeString()}
            `;
            blocksListElement.appendChild(blockDiv);
        }
    }
    
    updateTransactionsList(transaction) {
        const transactionsListElement = document.getElementById('transactionsList');
        if (transactionsListElement) {
            const txDiv = document.createElement('div');
            txDiv.className = 'transaction-item';
            txDiv.innerHTML = `
                <strong>${transaction.hash.substring(0, 10)}...</strong><br>
                From: ${transaction.from.substring(0, 10)}...<br>
                To: ${transaction.to.substring(0, 10)}...<br>
                Value: ${transaction.value} ETH<br>
                Status: ${transaction.status}
            `;
            transactionsListElement.appendChild(txDiv);
        }
    }
    
    updateContractsList(contract) {
        const contractsListElement = document.getElementById('contractsList');
        if (contractsListElement) {
            const contractDiv = document.createElement('div');
            contractDiv.className = 'contract-item';
            contractDiv.innerHTML = `
                <strong>${contract.name}</strong><br>
                Address: ${contract.address.substring(0, 10)}...<br>
                Deployed by: ${contract.deployedBy.substring(0, 10)}...<br>
                Time: ${new Date(contract.deployedAt).toLocaleTimeString()}
            `;
            contractsListElement.appendChild(contractDiv);
        }
    }
    
    showError(message) {
        const errorElement = document.getElementById('errorMessages');
        if (errorElement) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = message;
            errorElement.appendChild(errorDiv);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                errorDiv.remove();
            }, 5000);
        } else {
            console.error("Error:", message);
        }
    }
    
    showContractReady(contractName) {
        const messageElement = document.getElementById('statusMessages');
        if (messageElement) {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'success-message';
            msgDiv.textContent = `Contract ${contractName} compiled and ready for deployment`;
            messageElement.appendChild(msgDiv);
            
            // Auto-remove after 3 seconds
            setTimeout(() => {
                msgDiv.remove();
            }, 3000);
        }
    }
    
    loadExistingBlockchainHistory() {
        // Load all existing blocks (including those created before this user joined)
        const existingBlocks = this.model.getBlocks();
        console.log(`BlockchainView: Loading ${existingBlocks.length} existing blocks`);
        
        existingBlocks.forEach(block => {
            this.updateBlocksList(block);
        });
        
        // Load all existing contracts
        const existingContracts = this.model.getContracts();
        console.log(`BlockchainView: Loading ${existingContracts.length} existing contracts`);
        
        existingContracts.forEach(contract => {
            this.updateContractsList(contract);
        });
        
        // Load all existing transactions from all blocks
        let allTransactions = [];
        existingBlocks.forEach(block => {
            if (block.transactions && block.transactions.length > 0) {
                allTransactions = allTransactions.concat(block.transactions);
            }
        });
        
        console.log(`BlockchainView: Loading ${allTransactions.length} existing transactions`);
        allTransactions.forEach(transaction => {
            this.updateTransactionsList(transaction);
        });
        
        // Update the display with current state
        this.updateDisplay();
        
        console.log("BlockchainView: Blockchain history loaded successfully");
    }
} 