<div align="center">
  <img src="public/yz.png" alt="YZ Logo" width="200" height="241">
</div>

# YZ ETH Blockchain Simulator

[![Version](https://img.shields.io/badge/version-0.2.6-blue.svg)](https://github.com/YourUsername/YZ-ETH)
[![License](https://img.shields.io/badge/license-MPL--2.0-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](package.json)

A **web-based Solidity execution environment** using EthereumJS VM that provides a complete blockchain simulation experience. YZ-ETH allows developers to write, compile, deploy, and interact with smart contracts in a fully simulated Ethereum environment—all running locally in your browser.

## 🎯 What is YZ-ETH?

YZ-ETH is an educational and development tool that simulates a complete Ethereum blockchain environment without requiring any external blockchain connection. It's perfect for:

- **Learning Solidity**: Practice smart contract development in a safe, local environment
- **Rapid Prototyping**: Test contract logic quickly without gas costs or network delays
- **Educational Purposes**: Understand blockchain mechanics and smart contract interactions
- **Development Testing**: Debug contracts before deploying to real networks

## ✨ Key Features

### 🔧 **Smart Contract Development**
- **Code Editor**: Syntax-highlighted Solidity editor with auto-completion
- **Real-time Compilation**: Instant feedback on compilation errors
- **Multiple Contract Support**: Deploy and manage multiple contracts simultaneously
- **Built-in Examples**: Pre-loaded contract templates for learning

### ⚡ **Blockchain Simulation**
- **Complete EVM Environment**: Full Ethereum Virtual Machine compatibility
- **Block Management**: Real blockchain block structure with transactions
- **Gas Tracking**: Accurate gas usage calculation and reporting
- **Transaction History**: Complete audit trail of all operations

### 💰 **Account Management**
- **Multi-account Support**: Create and manage multiple Ethereum accounts
- **ETH Transfers**: Send ETH between accounts with full transaction tracking
- **Balance Tracking**: Real-time account balance updates
- **Private Key Management**: Secure key generation and storage

### 🔄 **Contract Interaction**
- **Function Execution**: Call any contract function with custom parameters
- **Return Value Display**: View function outputs and transaction results
- **Event Logging**: Monitor contract events and logs
- **ABI Detection**: Automatic contract interface recognition

### 🎨 **Modern User Interface**
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Material-UI Components**: Clean, professional interface
- **Real-time Updates**: Live blockchain state monitoring
- **Intuitive Navigation**: Easy-to-use dashboard and code editor

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0

### Installation

```bash
# Clone the repository
git clone https://github.com/YourUsername/YZ-ETH.git
cd yz-eth

# Install dependencies
npm install --legacy-peer-deps

# Build the Solidity worker
npm run build:worker
```

### Development

```bash
# Start the development server
npm run dev

# Open your browser to http://localhost:3000
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 📖 How to Use

### 1. **Writing Smart Contracts**

1. Navigate to the **Code Editor** tab
2. Write your Solidity code or select from built-in examples
3. Click **"Deploy Only"** to deploy without execution
4. Click **"Deploy & Run"** to deploy and execute the main function

### 2. **Interacting with Contracts**

1. Go to the **Dashboard** tab
2. View deployed contracts in the "Deployed Contracts" section
3. Click **"Execute"** on any contract to open the function dialog
4. Select a function, provide parameters (if needed), and execute

### 3. **Managing Accounts**

1. Visit the **Accounts** tab
2. View existing accounts and their ETH balances
3. Click **"Create Account"** to generate new accounts
4. Use the **Transfer** feature to send ETH between accounts

### 4. **Monitoring Activity**

- **Dashboard**: View current block information and transaction history
- **Transaction Panel**: Monitor all blockchain transactions in real-time
- **Logs**: Review contract events and execution logs

## 🏗️ Architecture Overview

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                     YZ-ETH Architecture                     │
├─────────────────────┬─────────────────────┬─────────────────┤
│   Frontend (React)  │   Core Engine       │   Blockchain    │
│                     │                     │                 │
│ ┌─────────────────┐ │ ┌─────────────────┐ │ ┌─────────────┐ │
│ │   App.tsx       │ │ │ SolidityExecutor│ │ │ EthereumJS  │ │
│ │   - Navigation  │ │ │ - Compilation   │ │ │ VM & EVM    │ │
│ │   - Theme       │ │ │ - Deployment    │ │ │             │ │
│ └─────────────────┘ │ │ - Execution     │ │ │             │ │
│                     │ └─────────────────┘ │ │             │ │
│ ┌─────────────────┐ │                     │ │             │ │
│ │  CodeEditor     │ │ ┌─────────────────┐ │ │             │ │
│ │  - Ace Editor   │ │ │  BlockManager   │ │ │             │ │
│ │  - Examples     │ │ │  - Transactions │ │ │             │ │
│ │  - Compilation  │ │ │  - Accounts     │ │ │             │ │
│ └─────────────────┘ │ │  - Block State  │ │ │             │ │
│                     │ └─────────────────┘ │ └─────────────┘ │
│ ┌─────────────────┐ │                     │                 │
│ │ BlockchainView  │ │ ┌─────────────────┐ │ ┌─────────────┐ │
│ │ - Dashboard     │ │ │   Solc Worker   │ │ │  Web Worker │ │
│ │ - Contracts     │ │ │ - Browser Comp. │ │ │  (Isolated) │ │
│ │ - Transactions  │ │ │ - Async Build   │ │ │             │ │
│ └─────────────────┘ │ └─────────────────┘ │ └─────────────┘ │
│                     │                     │                 │
│ ┌─────────────────┐ │                     │                 │
│ │AccountManagement│ │                     │                 │
│ │ - ETH Balances  │ │                     │                 │
│ │ - Transfers     │ │                     │                 │
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
- **`App.tsx`**: Main application shell with navigation and theming
- **`CodeEditor.tsx`**: Solidity code editor with syntax highlighting and examples
- **`BlockchainView.tsx`**: Dashboard showing blocks, transactions, and contract interaction
- **`AccountManagement.tsx`**: Account creation, balance viewing, and ETH transfers
- **`TransferModal.tsx`**: Modal for ETH transfers between accounts

### Data Flow

```
1. User writes Solidity code in CodeEditor
2. SolidityExecutor compiles code using Solc worker
3. Compiled bytecode is deployed via BlockManager
4. BlockManager creates transaction and executes on EthereumJS VM
5. Transaction results are stored in block state
6. UI components display updated blockchain state
7. User can interact with deployed contracts via BlockchainView
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
│   │   ├── App.tsx              # Main application shell
│   │   ├── CodeEditor.tsx       # Solidity code editor
│   │   ├── BlockchainView.tsx   # Enhanced blockchain dashboard
│   │   ├── AccountManagement.tsx # Account management interface
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
├── dist/                        # Build output
│   ├── cjs/                     # CommonJS build
│   ├── esm/                     # ES modules build
│   └── web/                     # Web application build
│
├── package.json                 # Project configuration
├── tsconfig.json                # TypeScript configuration
├── vite.config.ts               # Vite configuration
├── vitest.config.ts             # Test configuration
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

**Current Version**: `v0.2.6` (Pre-release)

### ✅ **Implemented Features**
- ✅ Solidity compilation and execution
- ✅ Contract deployment and interaction
- ✅ Account management and ETH transfers
- ✅ Real-time blockchain simulation
- ✅ Modern React UI with Material-UI
- ✅ Multiple contract support
- ✅ Transaction history and logging
- ✅ Built-in contract examples

### 🚧 **Known Issues**
- Some execution tests failing (contract function execution)
- Error handling could be improved
- Performance optimization needed for large contracts

### 🎯 **Planned Features**
- Enhanced debugging tools
- Contract interaction history
- Export/import functionality
- Advanced gas optimization analysis
- Multi-file Solidity project support

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

**YZ-ETH** - Making Ethereum development accessible to everyone. 🚀 