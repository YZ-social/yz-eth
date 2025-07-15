<div align="center">
  <img src="public/yz.png" alt="YZ Logo" width="200" height="241">
</div>

# YZ ETH Blockchain Simulator

[![Version](https://img.shields.io/badge/version-0.3.11-blue.svg)](https://github.com/YZ-social/yz-eth)
[![License](https://img.shields.io/badge/license-MPL--2.0-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](package.json)
[![Deploy](https://github.com/YZ-social/yz-eth/workflows/Deploy%20to%20GitHub%20Pages/badge.svg)](https://github.com/YZ-social/yz-eth/actions)
[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen.svg)](https://yz-social.github.io/yz-eth/)

A **web-based Solidity execution environment** using EthereumJS VM that provides a complete blockchain simulation experience. YZ-ETH allows developers to write, compile, deploy, and interact with smart contracts in a fully simulated Ethereum environment—all running locally in your browser.

## 🎯 What is YZ-ETH?

YZ-ETH is an educational and development tool that simulates a complete Ethereum blockchain environment without requiring any external blockchain connection. It's perfect for:

- **Learning Solidity**: Practice smart contract development in a safe, local environment
- **Rapid Prototyping**: Test contract logic quickly without gas costs or network delays
- **Educational Purposes**: Understand blockchain mechanics and smart contract interactions
- **Development Testing**: Debug contracts before deploying to real networks

## ✨ Key Features

### 🔧 **Smart Contract Development**
- **Code Editor**: Syntax-highlighted Solidity editor with auto-completion and persistent code state
- **Real-time Compilation**: Instant feedback on compilation errors
- **Multiple Contract Support**: Deploy and manage multiple contracts simultaneously
- **Built-in Examples**: Pre-loaded contract templates for learning (Basic, Data Structures, OOP, Tokens, Events)

### ⚡ **Blockchain Simulation**
- **Complete EVM Environment**: Full Ethereum Virtual Machine compatibility
- **Block Management**: Real blockchain block structure with transactions
- **Gas Tracking**: Accurate gas usage calculation and reporting with transaction numbers
- **Transaction History**: Complete audit trail with interactive transaction tiles

### 💰 **Account Management**
- **Multi-account Support**: Create and manage multiple Ethereum accounts
- **ETH Transfers**: Send ETH between accounts with full transaction tracking
- **Balance Tracking**: Real-time account balance updates
- **Private Key Management**: Secure key generation and storage

### 🔄 **Contract Interaction**
- **Function Execution**: Call any contract function with custom parameters via modal dialogs
- **Return Value Display**: View function outputs and transaction results with copy functionality
- **Event Logging**: Monitor contract events and logs within transaction details
- **ABI Detection**: Automatic contract interface recognition with function signatures

### 🎨 **Modern User Interface**
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Material-UI Components**: Clean, professional interface with consistent styling
- **Real-time Updates**: Live blockchain state monitoring via transaction slider bar
- **Intuitive Navigation**: Streamlined two-tab interface (Code Editor + Accounts)
- **Interactive Transaction Tiles**: Drag-to-scroll transaction history with click-for-details
- **Persistent State**: Code editor content persists across tab switches

## 🚀 Quick Start

### 🌐 **Try it Online**

**Live Demo**: [https://yz-social.github.io/yz-eth/](https://yz-social.github.io/yz-eth/)

No installation required! The application runs entirely in your browser.

### 💻 **Local Development**

#### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0

#### Installation

```bash
# Clone the repository
git clone https://github.com/YZ-social/yz-eth.git
cd yz-eth

# Install dependencies
npm install --legacy-peer-deps

# Build the Solidity worker
npm run build:worker
```

#### Development

```bash
# Start the development server
npm run dev

# Open your browser to http://localhost:3001
```

#### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### 🚀 **GitHub Pages Deployment**

The application is configured for automatic deployment to GitHub Pages:

```bash
# Manual deployment
npm run deploy

# Or push to main branch for automatic deployment
git push origin main
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## 📖 How to Use

### 1. **Writing Smart Contracts**

1. Open the **Code Editor** (default landing page)
2. Write your Solidity code or select from built-in examples
3. Click **"Deploy Only"** to deploy without execution
4. Click **"Deploy & Run"** to deploy and execute the main function
5. View compilation results and deployment status in the output panel

### 2. **Monitoring Blockchain Activity**

- **Transaction Slider Bar**: View all transactions in real-time at the bottom of the screen
- **Current Block Info**: Monitor block state in the sidebar
- **Transaction Details**: Click any transaction tile to view detailed information
- **Event Logs**: View contract events within each transaction's details

### 3. **Interacting with Contracts**

1. After deploying a contract, find it in the **Transaction Slider Bar**
2. Click the **"Execute"** button on deployment tiles
3. Select a function from the dropdown menu
4. Provide parameters (if needed) and execute
5. View results in the transaction details modal

### 4. **Managing Accounts**

1. Visit the **Accounts** tab
2. View existing accounts and their ETH balances
3. Click **"Create Account"** to generate new accounts
4. Use the **Transfer** feature to send ETH between accounts

### 5. **Transaction Management**

- **Transaction Tiles**: Each transaction is displayed as a tile with:
  - Transaction number and gas usage
  - Transaction type (deployment, execution, transfer)
  - Status indicators (success/failure)
  - Contract execution buttons for deployed contracts
- **Drag Navigation**: Drag the transaction bar to scroll through transaction history
- **Click for Details**: Click any tile to view comprehensive transaction information

## 🏗️ Architecture Overview

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                     YZ-ETH Architecture v0.3.4             │
├─────────────────────┬─────────────────────┬─────────────────┤
│   Frontend (React)  │   Core Engine       │   Blockchain    │
│                     │                     │                 │
│ ┌─────────────────┐ │ ┌─────────────────┐ │ ┌─────────────┐ │
│ │   App.tsx       │ │ │ SolidityExecutor│ │ │ EthereumJS  │ │
│ │   - Navigation  │ │ │ - Compilation   │ │ │ VM & EVM    │ │
│ │   - State Mgmt  │ │ │ - Deployment    │ │ │             │ │
│ │   - Modals      │ │ │ - Execution     │ │ │             │ │
│ └─────────────────┘ │ └─────────────────┘ │ │             │ │
│                     │                     │ │             │ │
│ ┌─────────────────┐ │ ┌─────────────────┐ │ │             │ │
│ │  CodeEditor     │ │ │  BlockManager   │ │ │             │ │
│ │  - Ace Editor   │ │ │  - Transactions │ │ │             │ │
│ │  - Examples     │ │ │  - Accounts     │ │ │             │ │
│ │  - Compilation  │ │ │  - Block State  │ │ │             │ │
│ │  - Persist Code │ │ │  - Event Logs   │ │ │             │ │
│ └─────────────────┘ │ └─────────────────┘ │ └─────────────┘ │
│                     │                     │                 │
│ ┌─────────────────┐ │ ┌─────────────────┐ │ ┌─────────────┐ │
│ │TransactionSlider│ │ │   Solc Worker   │ │ │  Web Worker │ │
│ │ - Tile Display  │ │ │ - Browser Comp. │ │ │  (Isolated) │ │
│ │ - Drag Scroll   │ │ │ - Async Build   │ │ │             │ │
│ │ - Click Details │ │ │ - Error Handle  │ │ │             │ │
│ │ - Contract Exec │ │ └─────────────────┘ │ └─────────────┘ │
│ └─────────────────┘ │                     │                 │
│                     │                     │                 │
│ ┌─────────────────┐ │                     │                 │
│ │AccountManagement│ │                     │                 │
│ │ - ETH Balances  │ │                     │                 │
│ │ - Transfers     │ │                     │                 │
│ │ - Account Mgmt  │ │                     │                 │
│ └─────────────────┘ │                     │                 │
│                     │                     │                 │
│ ┌─────────────────┐ │                     │                 │
│ │Transaction Modal│ │                     │                 │
│ │ - Full Details  │ │                     │                 │
│ │ - Event Logs    │ │                     │                 │
│ │ - Return Values │ │                     │                 │
│ └─────────────────┘ │                     │                 │
└─────────────────────┴─────────────────────┴─────────────────┘
```

### Key Classes and Responsibilities

#### **`BlockManager`** (`src/blockManager.ts`)
The core blockchain simulation engine that manages:
- **Virtual Machine**: EthereumJS VM instance for contract execution
- **Block State**: Current block information, transactions, and gas usage
- **Account Management**: ETH accounts, balances, and private keys
- **Transaction Processing**: Contract deployments, function calls, and ETH transfers
- **State Management**: Merkle state tree for account and contract storage

#### **`SolidityExecutor`** (`src/solidityExecutor.ts`)
Handles Solidity compilation and contract execution:
- **Compilation**: Uses Solc compiler (via web worker) to compile Solidity source
- **Contract Deployment**: Deploys compiled bytecode to the blockchain
- **Function Execution**: Executes contract functions with parameter encoding/decoding
- **ABI Management**: Stores and retrieves contract ABIs for interaction
- **Integration**: Works with BlockManager for transaction-based execution

#### **React Components** (`public/components/`)
- **`App.tsx`**: Main application shell with navigation, state management, and modal coordination
- **`CodeEditor.tsx`**: Solidity code editor with syntax highlighting, examples, and persistent code state
- **`AccountManagement.tsx`**: Account creation, balance viewing, and ETH transfers
- **`TransactionSliderBar.tsx`**: Interactive transaction tile display with drag navigation and contract execution
- **`TransactionDetailsModal.tsx`**: Comprehensive transaction details with event logs and return values
- **`TransferModal.tsx`**: Modal for ETH transfers between accounts

### Data Flow

```
1. User writes Solidity code in CodeEditor (code persists across tab switches)
2. SolidityExecutor compiles code using Solc worker in background
3. Compiled bytecode is deployed via BlockManager
4. BlockManager creates transaction and executes on EthereumJS VM
5. Transaction results are stored in block state with event logs
6. TransactionSliderBar displays new transaction tile with real-time updates
7. User can click transaction tiles to view detailed information
8. Contract deployment tiles show "Execute" button for function calls
9. User can interact with deployed contracts via modal dialogs
10. All transaction details, event logs, and return values are accessible
```

## 🛠️ Technology Stack

### **Frontend**
- **React 18**: Modern React with hooks and functional components
- **TypeScript**: Type-safe development with full IDE support
- **Material-UI**: Professional, accessible UI components
- **Ace Editor**: Syntax-highlighted code editor with Solidity support
- **Vite**: Fast development server and build tool

### **Blockchain**
- **EthereumJS VM**: Complete Ethereum Virtual Machine implementation
- **EthereumJS EVM**: Ethereum execution environment
- **EthereumJS StateManager**: Merkle tree state management
- **EthereumJS Common**: Ethereum network configuration
- **Ethers.js**: Contract ABI encoding/decoding utilities

### **Build & Development**
- **Solc**: Official Solidity compiler (v0.8.30)
- **Web Workers**: Isolated compilation environment
- **Browserify**: Solc worker bundling for browser compatibility
- **Vitest**: Fast unit testing framework
- **ESLint + Biome**: Code linting and formatting

## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build both library and web application |
| `npm run build:lib` | Build library (CommonJS + ESM modules) |
| `npm run build:web` | Build web application for production |
| `npm run build:worker` | Build Solidity compiler web worker |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run all tests (Node.js + browser) |
| `npm run test:node` | Run Node.js tests only |
| `npm run test:browser` | Run browser tests only |
| `npm run lint` | Run code linting |
| `npm run lint:fix` | Fix linting issues automatically |
| `npm run clean` | Clean build artifacts |
| `npm run deploy` | Deploy to GitHub Pages |

## 📁 Project Structure

```
yz-eth/
├── src/                          # Core library source code
│   ├── blockManager.ts           # Blockchain state management
│   ├── solidityExecutor.ts       # Solidity compilation & execution
│   ├── solc-worker.js           # Web worker for Solidity compilation
│   ├── components/              # React components (library exports)
│   │   ├── App.tsx              # Basic app component
│   │   ├── BlockchainView.tsx   # Blockchain dashboard
│   │   └── index.ts             # Component exports
│   └── index.ts                 # Main library entry point
│
├── public/                      # Web application
│   ├── components/              # Web app React components
│   │   ├── App.tsx              # Main application shell with navigation
│   │   ├── CodeEditor.tsx       # Solidity code editor with persistence
│   │   ├── AccountManagement.tsx # Account management interface
│   │   ├── TransactionSliderBar.tsx # Interactive transaction tiles
│   │   ├── TransactionDetailsModal.tsx # Transaction details modal
│   │   ├── TransferModal.tsx    # ETH transfer modal
│   │   └── index.ts             # Component exports
│   ├── app.tsx                  # Application entry point
│   ├── index.html               # HTML template
│   ├── style.css                # Global styles
│   ├── yz.png                   # Application logo
│   └── tsconfig.json            # TypeScript config for public
│
├── test/                        # Test files
│   ├── browser-solc.spec.ts     # Browser Solc integration tests
│   ├── compilation.spec.ts      # Compilation tests
│   ├── simple.spec.ts           # Basic functionality tests
│   ├── solc-local.spec.ts       # Local Solc tests
│   └── web-worker-solc.spec.ts  # Web worker tests
│
├── .github/                     # GitHub configuration
│   └── workflows/               # GitHub Actions
│       └── deploy.yml           # Automatic deployment workflow
│
├── dist/                        # Build output
│   ├── cjs/                     # CommonJS build
│   ├── esm/                     # ES modules build
│   └── web/                     # Web application build (deployed to GitHub Pages)
│
├── package.json                 # Project configuration
├── tsconfig.json                # TypeScript configuration
├── vite.config.ts               # Vite configuration with GitHub Pages support
├── vitest.config.ts             # Test configuration
├── DEPLOYMENT.md                # Deployment guide
└── README.md                    # This file
```

## 🧪 Contract Examples

YZ-ETH includes several built-in contract examples:

### **Simple Contract**
Basic "Hello World" example demonstrating:
- Function definitions
- Return values
- Pure functions

### **Counter Contract**
State management example with:
- State variables
- Increment operations
- View functions

### **Storage Contract**
Key-value storage operations:
- Setting values
- Getting values
- State persistence

### **Calculator Contract**
Mathematical operations:
- Addition and multiplication
- Pure functions with parameters
- Return value handling

### **Array Operations**
Advanced data structures:
- Dynamic arrays
- Array manipulation
- Complex state management

## 🔧 Development Status

**Current Version**: `v0.3.11` (Stable)

### ✅ **Implemented Features**
- ✅ Solidity compilation and execution
- ✅ Contract deployment and interaction
- ✅ Account management and ETH transfers
- ✅ Real-time blockchain simulation
- ✅ Modern React UI with Material-UI
- ✅ Multiple contract support
- ✅ Interactive transaction tiles with drag navigation
- ✅ Transaction details modal with event logs
- ✅ Persistent code editor state
- ✅ GitHub Pages deployment
- ✅ Built-in contract examples (Basic, Data Structures, OOP, Tokens, Events)

### 🚧 **Recent Improvements (v0.3.x)**
- ✅ Removed Dashboard panel for streamlined UI
- ✅ Added transaction slider bar with real-time updates
- ✅ Implemented drag-to-scroll transaction navigation
- ✅ Added transaction numbering and gas tracking
- ✅ Event logs moved to transaction details modal
- ✅ Fixed code persistence across tab switches
- ✅ Unified dialog styling across the application
- ✅ Added GitHub Pages deployment automation

### 🎯 **Planned Features**
- Enhanced debugging tools
- Contract interaction history
- Export/import functionality
- Advanced gas optimization analysis
- Multi-file Solidity project support
- Custom domain deployment

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and add tests if applicable
4. **Run tests**: `npm run test`
5. **Run linting**: `npm run lint`
6. **Commit your changes**: `git commit -m 'Add amazing feature'`
7. **Push to the branch**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Add tests for new functionality
- Update documentation for API changes
- Ensure all linting passes
- Test in both development and production builds

## 📄 License

This project is licensed under the **Mozilla Public License 2.0** (MPL-2.0). See the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/YourUsername/YZ-ETH/issues)
- **Documentation**: This README and inline code documentation
- **Examples**: Built-in contract examples in the application

## 🙏 Acknowledgments

- **EthereumJS Team**: For the excellent Ethereum implementation libraries
- **Solidity Team**: For the Solidity compiler and language
- **Material-UI Team**: For the beautiful React components
- **Vite Team**: For the fast development experience

---

**YZ-ETH** - Making Ethereum development accessible to everyone. 🚀 # Deployment trigger Sat Jul 12 00:05:57 PDT 2025
