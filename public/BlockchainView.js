// Multisynq View Bridge - Connects Model to React Components (following Hello World pattern)

// Hex formatting utilities for clean console output
function formatHexValue(hexValue, prefixLength = 0, suffixLength = 5) {
    if (!hexValue || typeof hexValue !== 'string') {
        return hexValue;
    }
    if (!hexValue.startsWith('0x')) {
        return hexValue;
    }
    const hexPart = hexValue.slice(2);
    if (hexPart.length <= prefixLength + suffixLength + 3) {
        return hexValue;
    }
    const prefix = prefixLength > 0 ? hexPart.slice(0, prefixLength) : '0';
    const suffix = hexPart.slice(-suffixLength);
    return `0x${prefix}...${suffix}`;
}

function formatAddress(address) {
    return formatHexValue(address, 0, 5);
}

function formatHash(hash) {
    return formatHexValue(hash, 0, 5);
}

function formatId(id) {
    return formatHexValue(id, 0, 5);
}

class BlockchainView extends Multisynq.View {
    constructor(model) {
        super(model);
        this.model = model; // Store model reference for read-only access (like Hello World)
        
        console.log("BlockchainView: Initializing bridge to React...");
        
        // DEBUG: Display the model when view is constructed
        console.log("BlockchainView: Model object:", this.model);
        console.log("BlockchainView: Model methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(this.model)));
        console.log("BlockchainView: Model state properties:", {
            blocksLength: this.model.blocks?.length || 0,
            accountsLength: this.model.accounts?.length || 0,
            contractsLength: this.model.contracts?.length || 0,
            pendingTransactionsLength: this.model.pendingTransactions?.length || 0,
            currentBlockNumber: this.model.currentBlockNumber,
            heartbeatCount: this.model.heartbeatCount
        });
        
        // Subscribe to model events (exactly like working test)
        this.subscribe("blockchain", "blockAdded", "handleBlockAdded");
        this.subscribe("blockchain", "transactionExecuted", "handleTransactionExecuted");
        this.subscribe("blockchain", "transactionFailed", "handleTransactionFailed");
        this.subscribe("blockchain", "contractDeployed", "handleContractDeployed");
        this.subscribe("blockchain", "deploymentFailed", "handleDeploymentFailed");
        this.subscribe("blockchain", "tick", "handleTick");
        this.subscribe("blockchain", "stateUpdate", "handleStateUpdate");
        this.subscribe("contract", "readyForDeployment", "handleContractReady");
        this.subscribe("system", "heartbeat", "handleSystemHeartbeat");
        
        console.log("BlockchainView: Bridge subscriptions set up");
        
        // Load existing state immediately (like Hello World's counterChanged())
        this.loadCurrentState();
    }
    
    handleBlockAdded(data) {
        console.log("BlockchainView: Block added event received:", data);
        this.notifyReact("blockAdded", data);
        // Read fresh state from model after change (like Hello World pattern)
        this.loadCurrentState();
    }
    
    handleTransactionExecuted(data) {
        console.log("BlockchainView: Transaction executed event received:", data);
        this.notifyReact("transactionExecuted", data);
        // Read fresh state from model after change (like Hello World pattern)
        this.loadCurrentState();
    }
    
    handleTransactionFailed(data) {
        console.log("BlockchainView: Transaction failed event received:", data);
        this.notifyReact("transactionFailed", data);
    }
    
    handleContractDeployed(data) {
        console.log("BlockchainView: Contract deployed event received:", data);
        this.notifyReact("contractDeployed", data);
        // Read fresh state from model after change
        this.loadCurrentState();
    }
    
    handleDeploymentFailed(data) {
        console.log("BlockchainView: Deployment failed event received:", data);
        this.notifyReact("deploymentFailed", data);
    }
    
    handleTick(data) {
        this.notifyReact("tick", data);
    }
    
    handleStateUpdate(data) {
        console.log("BlockchainView: Full state update received:", data);
        this.notifyReact("stateUpdate", data);
    }
    
    handleContractReady(data) {
        console.log("BlockchainView: Contract ready for deployment:", data);
        this.notifyReact("contractReady", data);
    }
    
    handleSystemHeartbeat(data) {
        this.notifyReact("systemHeartbeat", data);
    }
    
    // Request full state update (proper Multisynq pattern with direct model read access)
    requestFullStateUpdate() {
        // Views CAN read directly from model (like Hello World tutorial)
        console.log("BlockchainView: Reading current state directly from model");
        this.loadCurrentState();
    }
    
    // Load current state by reading directly from model (like Hello World's counterChanged())
    loadCurrentState() {
        const currentState = {
            blocks: this.model.getBlocks(),
            accounts: this.model.getAccounts(),
            contracts: this.model.getContracts(),
            pendingTransactions: this.model.getPendingTransactions(),
            currentBlockNumber: this.model.getCurrentBlockNumber(),
            heartbeatCount: this.model.getHeartbeatCount()
        };
        
        // DEBUG: Display detailed block information when view is constructed/updated
        console.log("BlockchainView: Broadcasting current state to React:", currentState);
        console.log("BlockchainView: Total blocks found:", currentState.blocks.length);
        
        if (currentState.blocks.length > 0) {
            console.log("BlockchainView: Block details:");
            currentState.blocks.forEach((block, index) => {
                console.log(`  Block ${index} (Number: ${block.number}):`);
                console.log(`    Hash: ${formatHash(block.hash)}`);
                console.log(`    Parent Hash: ${formatHash(block.parentHash)}`);
                console.log(`    Timestamp: ${block.timestamp}`);
                console.log(`    Transactions: ${block.transactions?.length || 0}`);
                
                if (block.transactions && block.transactions.length > 0) {
                    console.log(`    Transaction details:`);
                    block.transactions.forEach((tx, txIndex) => {
                        console.log(`      TX ${txIndex}: ${formatId(tx.hash || tx.id) || 'No ID'}`);
                        console.log(`        Type: ${tx.type || 'unknown'}`);
                        console.log(`        Status: ${tx.status || 'unknown'}`);
                        console.log(`        From: ${formatAddress(tx.from) || 'N/A'}`);
                        console.log(`        To: ${formatAddress(tx.to) || 'N/A'}`);
                        console.log(`        Value: ${tx.value || '0'}`);
                        if (tx.contractAddress) {
                            console.log(`        Contract Address: ${formatAddress(tx.contractAddress)}`);
                        }
                    });
                } else {
                    console.log(`    No transactions in this block`);
                }
            });
        } else {
            console.log("BlockchainView: No blocks found in model");
        }
        this.notifyReact("stateUpdate", currentState);
    }
    
    // Bridge method to notify React components via window events
    notifyReact(eventType, data) {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(`multisynq${eventType}`, { detail: data }));
        }
    }
    
    // Methods for React to call (publish to model)
    createBlock(data) {
        console.log("BlockchainView: createBlock called with data:", data);
        this.publish("blockchain", "createBlock", data);
    }
    
    executeTransaction(data) {
        console.log("BlockchainView: executeTransaction called with data:", data);
        this.publish("blockchain", "executeTransaction", data);
    }
    
    deployContract(data) {
        console.log("BlockchainView: Publishing contract deployment to model:", data);
        this.publish("blockchain", "deployContract", data);
    }
    
    requestState() {
        this.requestFullStateUpdate();
    }
}

// Make the view available globally (Views don't need .register() like Models do)
if (typeof Multisynq !== 'undefined' && Multisynq.View) {
    if (!window.blockchainViewLoaded) {
        // Make it available globally for React (no registration needed for Views)
        window.BlockchainView = BlockchainView;
        window.blockchainViewLoaded = true;
        console.log("BlockchainView: Class defined and made available globally");
    } else {
        console.log("BlockchainView: Already loaded, skipping");
    }
} else {
    console.error("BlockchainView: Multisynq not available");
} 