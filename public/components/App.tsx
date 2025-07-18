import {
  AccountBalanceWallet as AccountBalanceWalletIcon,
  Code as CodeIcon,
  SwapHoriz as SwapHorizIcon,
  PlayArrow as PlayArrowIcon,
  Close as CloseIcon,
  MenuBook as MenuBookIcon,
  ArrowDropDown as ArrowDropDownIcon,
} from '@mui/icons-material'
import {
  AppBar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
  Paper,
  Select,
  MenuItem,
  TextField,
  Chip,
  CircularProgress,
  Menu,
} from '@mui/material'
import React, { useState, useEffect } from 'react'
import { BlockManager } from '../../src/blockManager'
import { SolidityExecutor } from '../../src/solidityExecutor'
import { AccountManagement, CodeEditor, TransferModal, TransactionDetailsModal } from './index'
import packageJson from '../../package.json'
import TransactionSliderBar from './TransactionSliderBar';
import { Transaction } from '../../src/blockManager';

const drawerWidth = 240

// Example contracts data - moved from CodeEditor.tsx
const exampleContracts = {
  Basics: [
    {
      name: 'Simple',
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Simple {
    function main() public pure returns (string memory) {
        return "Hello from EthereumJS!";
    }
}`,
    },
    {
      name: 'Counter',
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Counter {
    uint256 private count;
    
    function increment() public {
        count++;
    }
    
    function getCount() public view returns (uint256) {
        return count;
    }
    
    function main() public {
        increment();
        increment();
        increment();
    }
}`,
    },
    {
      name: 'Calculator',
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Calculator {
    function add(uint256 a, uint256 b) public pure returns (uint256) {
        return a + b;
    }
    
    function multiply(uint256 a, uint256 b) public pure returns (uint256) {
        return a * b;
    }
    
    function main() public pure returns (uint256) {
        return add(5, 3) + multiply(2, 4);
    }
}`,
    },
    {
      name: 'Storage',
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Storage {
    uint256 private storedData;
    
    function set(uint256 x) public {
        storedData = x;
    }
    
    function get() public view returns (uint256) {
        return storedData;
    }
    
    function main() public {
        set(42);
    }
}`,
    },
  ],
  'Data Structures': [
    {
      name: 'Arrays',
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ArrayOperations {
    uint256[] private numbers;
    
    function addNumber(uint256 num) public {
        numbers.push(num);
    }
    
    function getNumbers() public view returns (uint256[] memory) {
        return numbers;
    }
    
    function sum() public view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < numbers.length; i++) {
            total += numbers[i];
        }
        return total;
    }
    
    function main() public {
        addNumber(10);
        addNumber(20);
        addNumber(30);
    }
}`,
    },
    {
      name: 'Mappings',
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MappingExample {
    mapping(address => uint256) private balances;
    mapping(address => string) private names;
    
    function setBalance(address user, uint256 amount) public {
        balances[user] = amount;
    }
    
    function setName(address user, string memory name) public {
        names[user] = name;
    }
    
    function getBalance(address user) public view returns (uint256) {
        return balances[user];
    }
    
    function getName(address user) public view returns (string memory) {
        return names[user];
    }
    
    function main() public {
        address user = address(0x123);
        setBalance(user, 1000);
        setName(user, "Alice");
    }
}`,
    },
    {
      name: 'Structs',
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract StructExample {
    struct Person {
        string name;
        uint256 age;
        bool isActive;
    }
    
    Person[] private people;
    
    function addPerson(string memory name, uint256 age) public {
        people.push(Person(name, age, true));
    }
    
    function getPerson(uint256 index) public view returns (string memory, uint256, bool) {
        require(index < people.length, "Person not found");
        Person memory person = people[index];
        return (person.name, person.age, person.isActive);
    }
    
    function getPersonCount() public view returns (uint256) {
        return people.length;
    }
    
    function main() public {
        addPerson("Alice", 25);
        addPerson("Bob", 30);
        addPerson("Charlie", 35);
    }
}`,
    },
    {
      name: 'Enums',
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EnumExample {
    enum Status { Pending, Approved, Rejected, Cancelled }
    enum Priority { Low, Medium, High, Critical }
    
    struct Task {
        string description;
        Status status;
        Priority priority;
        uint256 createdAt;
    }
    
    Task[] private tasks;
    
    function addTask(string memory description, Priority priority) public {
        tasks.push(Task(description, Status.Pending, priority, block.timestamp));
    }
    
    function updateStatus(uint256 taskId, Status newStatus) public {
        require(taskId < tasks.length, "Task not found");
        tasks[taskId].status = newStatus;
    }
    
    function getTask(uint256 taskId) public view returns (string memory, Status, Priority, uint256) {
        require(taskId < tasks.length, "Task not found");
        Task memory task = tasks[taskId];
        return (task.description, task.status, task.priority, task.createdAt);
    }
    
    function getTasksByStatus(Status status) public view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < tasks.length; i++) {
            if (tasks[i].status == status) {
                count++;
            }
        }
        
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < tasks.length; i++) {
            if (tasks[i].status == status) {
                result[index] = i;
                index++;
            }
        }
        return result;
    }
    
    function main() public {
        addTask("Complete project", Priority.High);
        addTask("Review code", Priority.Medium);
        addTask("Write tests", Priority.Critical);
        updateStatus(0, Status.Approved);
    }
}`,
    },
  ],
  'Advanced Features': [
    {
      name: 'Events',
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EventExample {
    event Transfer(address indexed from, address indexed to, uint256 amount);
    event UserRegistered(address indexed user, string name);
    
    mapping(address => string) private users;
    
    function registerUser(string memory name) public {
        users[msg.sender] = name;
        emit UserRegistered(msg.sender, name);
    }
    
    function transfer(address to, uint256 amount) public {
        emit Transfer(msg.sender, to, amount);
    }
    
    function getUserName(address user) public view returns (string memory) {
        return users[user];
    }
    
    function main() public {
        registerUser("TestUser");
        transfer(address(0x456), 100);
    }
}`,
    },
    {
      name: 'Modifiers',
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ModifierExample {
    address private owner;
    mapping(address => bool) private authorized;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyAuthorized() {
        require(authorized[msg.sender], "Not authorized");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        authorized[msg.sender] = true;
    }
    
    function addAuthorized(address user) public onlyOwner {
        authorized[user] = true;
    }
    
    function removeAuthorized(address user) public onlyOwner {
        authorized[user] = false;
    }
    
    function authorizedFunction() public onlyAuthorized returns (string memory) {
        return "This function is only for authorized users";
    }
    
    function main() public {
        // This will work because msg.sender is owner
        addAuthorized(address(0x789));
        authorizedFunction();
    }
}`,
    },
    {
      name: 'Inheritance',
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Animal {
    string public name;
    uint256 public age;
    
    constructor() {
        name = "Unknown";
        age = 0;
    }
    
    function setName(string memory _name) public {
        name = _name;
    }
    
    function setAge(uint256 _age) public {
        age = _age;
    }
    
    function makeSound() public virtual returns (string memory) {
        return "Some sound";
    }
}

contract Dog is Animal {
    constructor() {
        setName("Buddy");
        setAge(3);
    }
    
    function makeSound() public virtual override returns (string memory) {
        return "Woof!";
    }
    
    function fetch() public returns (string memory) {
        return "Fetching the ball!";
    }
}

contract Cat is Animal {
    constructor() {
        setName("Whiskers");
        setAge(2);
    }
    
    function makeSound() public virtual override returns (string memory) {
        return "Meow!";
    }
    
    function purr() public returns (string memory) {
        return "Purring...";
    }
}

contract PetShop {
    function main() public returns (string memory) {
        Dog dog = new Dog();
        Cat cat = new Cat();
        
        string memory dogSound = dog.makeSound();
        string memory catSound = cat.makeSound();
        
        return string(abi.encodePacked("Dog says: ", dogSound, ", Cat says: ", catSound));
    }
}`,
    },
    {
      name: 'Interfaces',
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICalculator {
    function add(uint256 a, uint256 b) external pure returns (uint256);
    function subtract(uint256 a, uint256 b) external pure returns (uint256);
    function multiply(uint256 a, uint256 b) external pure returns (uint256);
    function divide(uint256 a, uint256 b) external pure returns (uint256);
}

contract AdvancedCalculator is ICalculator {
    function add(uint256 a, uint256 b) public pure override returns (uint256) {
        return a + b;
    }
    
    function subtract(uint256 a, uint256 b) public pure override returns (uint256) {
        require(a >= b, "Subtraction underflow");
        return a - b;
    }
    
    function multiply(uint256 a, uint256 b) public pure override returns (uint256) {
        return a * b;
    }
    
    function divide(uint256 a, uint256 b) public pure override returns (uint256) {
        require(b > 0, "Division by zero");
        return a / b;
    }
    
    function power(uint256 base, uint256 exponent) public pure returns (uint256) {
        uint256 result = 1;
        for (uint256 i = 0; i < exponent; i++) {
            result *= base;
        }
        return result;
    }
    
    function main() public pure returns (uint256) {
        return power(2, 8); // 2^8 = 256
    }
}`,
    },
    {
      name: 'Library',
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library MathUtils {
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
    
    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }
    
    function average(uint256 a, uint256 b) internal pure returns (uint256) {
        return (a + b) / 2;
    }
    
    function isEven(uint256 num) internal pure returns (bool) {
        return num % 2 == 0;
    }
    
    function factorial(uint256 n) internal pure returns (uint256) {
        if (n <= 1) return 1;
        uint256 result = 1;
        for (uint256 i = 2; i <= n; i++) {
            result *= i;
        }
        return result;
    }
}

contract LibraryExample {
    using MathUtils for uint256;
    
    function testMath() public pure returns (uint256, uint256, uint256, bool, uint256) {
        uint256 a = 10;
        uint256 b = 20;
        
        uint256 minVal = a.min(b);
        uint256 maxVal = a.max(b);
        uint256 avgVal = a.average(b);
        bool isEvenNum = a.isEven();
        uint256 fact = MathUtils.factorial(5);
        
        return (minVal, maxVal, avgVal, isEvenNum, fact);
    }
    
    function main() public pure returns (uint256) {
        return MathUtils.factorial(5); // 5! = 120
    }
}`,
    },
  ],
  'Error Handling': [
    {
      name: 'Custom Errors',
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ErrorHandling {
    error InsufficientBalance(uint256 available, uint256 requested);
    error UserNotFound(address user);
    error InvalidAmount(uint256 amount);
    
    mapping(address => uint256) private balances;
    
    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }
    
    function withdraw(uint256 amount) public {
        if (amount == 0) {
            revert InvalidAmount(amount);
        }
        
        if (balances[msg.sender] < amount) {
            revert InsufficientBalance(balances[msg.sender], amount);
        }
        
        balances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
    }
    
    function getBalance(address user) public view returns (uint256) {
        if (user == address(0)) {
            revert UserNotFound(user);
        }
        return balances[user];
    }
    
    function main() public {
        // This will work
        deposit();
        getBalance(msg.sender);
    }
}`,
    },
    {
      name: 'Gas Optimization',
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract GasOptimization {
    // Gas efficient: packed struct
    struct User {
        uint32 id;
        uint32 age;
        uint64 balance;
        bool isActive;
    }
    
    // Gas inefficient: separate variables
    uint256 private userId;
    uint256 private userAge;
    uint256 private userBalance;
    bool private userActive;
    
    User[] private users;
    
    function addUser(uint32 id, uint32 age, uint64 balance) public {
        users.push(User(id, age, balance, true));
    }
    
    function addUserInefficient(uint256 id, uint256 age, uint256 balance) public {
        userId = id;
        userAge = age;
        userBalance = balance;
        userActive = true;
    }
    
    function getUser(uint256 index) public view returns (uint32, uint32, uint64, bool) {
        require(index < users.length, "User not found");
        User memory user = users[index];
        return (user.id, user.age, user.balance, user.isActive);
    }
    
    function getUserCount() public view returns (uint256) {
        return users.length;
    }
    
    function main() public {
        addUser(1, 25, 1000);
        addUser(2, 30, 2000);
        addUser(3, 35, 3000);
    }
}`,
    },
  ],
  Tokens: [
    {
      name: 'Basic Token',
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Token {
    string public name = "MyToken";
    string public symbol = "MTK";
    uint8 public decimals = 18;
    uint256 public totalSupply = 1000000 * 10**18;
    mapping(address => uint256) public balanceOf;

    constructor() {
        balanceOf[msg.sender] = totalSupply;
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}`,
    },
    {
      name: 'ERC20 Token',
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract ERC20 is IERC20 {
    string public name = "MyERC20Token";
    string public symbol = "MET";
    uint8 public decimals = 18;
    uint256 private _totalSupply = 1000000 * 10**18;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    constructor() {
        _balances[msg.sender] = _totalSupply;
    }

    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    function transfer(address recipient, uint256 amount) public override returns (bool) {
        require(_balances[msg.sender] >= amount, "Insufficient balance");
        _balances[msg.sender] -= amount;
        _balances[recipient] += amount;
        emit Transfer(msg.sender, recipient, amount);
        return true;
    }

    function allowance(address owner, address spender) public view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) public override returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        require(_balances[sender] >= amount, "Insufficient balance");
        require(_allowances[sender][msg.sender] >= amount, "Insufficient allowance");
        _balances[sender] -= amount;
        _balances[recipient] += amount;
        _allowances[sender][msg.sender] -= amount;
        emit Transfer(sender, recipient, amount);
        return true;
    }
}`,
    },
  ],
  Events: [
    {
      name: 'Event Counter',
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EventCounter {
    uint256 private count = 0;
    
    // Define events
    event CountIncremented(address indexed user, uint256 newCount, uint256 timestamp);
    event CountReset(address indexed user, uint256 timestamp);
    event CountSet(address indexed user, uint256 oldCount, uint256 newCount, uint256 timestamp);
    
    function increment() public {
        count++;
        // Emit event when count is incremented
        emit CountIncremented(msg.sender, count, block.timestamp);
    }
    
    function reset() public {
        uint256 oldCount = count;
        count = 0;
        // Emit event when count is reset
        emit CountReset(msg.sender, block.timestamp);
    }
    
    function setCount(uint256 newCount) public {
        uint256 oldCount = count;
        count = newCount;
        // Emit event when count is set
        emit CountSet(msg.sender, oldCount, newCount, block.timestamp);
    }
    
    function getCount() public view returns (uint256) {
        return count;
    }
    
    function main() public {
        increment();
        increment();
        setCount(10);
        increment();
    }
}`,
    },
    {
      name: 'Event Logger',
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EventLogger {
    // Different types of events
    event UserRegistered(address indexed user, string name, uint256 timestamp);
    event UserUpdated(address indexed user, string oldName, string newName, uint256 timestamp);
    event UserDeleted(address indexed user, uint256 timestamp);
    event MessageSent(address indexed from, address indexed to, string message, uint256 timestamp);
    
    mapping(address => string) private userNames;
    mapping(address => bool) private userExists;
    
    function registerUser(string memory name) public {
        require(!userExists[msg.sender], "User already exists");
        userNames[msg.sender] = name;
        userExists[msg.sender] = true;
        emit UserRegistered(msg.sender, name, block.timestamp);
    }
    
    function updateUser(string memory newName) public {
        require(userExists[msg.sender], "User does not exist");
        string memory oldName = userNames[msg.sender];
        userNames[msg.sender] = newName;
        emit UserUpdated(msg.sender, oldName, newName, block.timestamp);
    }
    
    function deleteUser() public {
        require(userExists[msg.sender], "User does not exist");
        delete userNames[msg.sender];
        delete userExists[msg.sender];
        emit UserDeleted(msg.sender, block.timestamp);
    }
    
    function sendMessage(address to, string memory message) public {
        require(userExists[msg.sender], "Sender not registered");
        require(userExists[to], "Recipient not registered");
        emit MessageSent(msg.sender, to, message, block.timestamp);
    }
    
    function getUserName(address user) public view returns (string memory) {
        return userNames[user];
    }
    
    function main() public {
        registerUser("Alice");
        updateUser("Alice Smith");
        sendMessage(address(0x123), "Hello World!");
    }
}`,
    },
    {
      name: 'Token Events',
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TokenEvents {
    string public name = "Event Token";
    string public symbol = "EVT";
    uint8 public decimals = 18;
    uint256 public totalSupply = 1000000 * 10**18;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // Standard ERC20 events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    // Custom events
    event TokensMinted(address indexed to, uint256 amount, uint256 timestamp);
    event TokensBurned(address indexed from, uint256 amount, uint256 timestamp);
    event EmergencyStop(address indexed by, uint256 timestamp);
    
    bool public paused = false;
    
    constructor() {
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    function transfer(address to, uint256 amount) public whenNotPaused returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) public whenNotPaused returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) public whenNotPaused returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        emit Transfer(from, to, amount);
        return true;
    }
    
    function mint(address to, uint256 amount) public whenNotPaused {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit TokensMinted(to, amount, block.timestamp);
        emit Transfer(address(0), to, amount);
    }
    
    function burn(uint256 amount) public whenNotPaused {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        emit TokensBurned(msg.sender, amount, block.timestamp);
        emit Transfer(msg.sender, address(0), amount);
    }
    
    function emergencyStop() public {
        paused = true;
        emit EmergencyStop(msg.sender, block.timestamp);
    }
    
    function main() public {
        mint(address(0x123), 1000 * 10**18);
        transfer(address(0x456), 500 * 10**18);
        burn(100 * 10**18);
    }
}`,
    },
  ],
}

// Create singleton instances to prevent duplicate creation in React.StrictMode
let globalBlockManager: BlockManager | null = null
let globalExecutor: SolidityExecutor | null = null

const getBlockManager = () => {
  if (!globalBlockManager) {
    globalBlockManager = new BlockManager()
  }
  return globalBlockManager
}

const getExecutor = () => {
  if (!globalExecutor) {
    globalExecutor = new SolidityExecutor(getBlockManager())
  }
  return globalExecutor
}

export default function App() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [activeSection, setActiveSection] = useState('code')
  const blockManager = getBlockManager()
  const executor = getExecutor()
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentBlock, setCurrentBlock] = useState<any>(null);
  const [deployedContracts, setDeployedContracts] = useState<any[]>([]);
  const [returnValueDialog, setReturnValueDialog] = useState<{ open: boolean; value: string; title: string }>({
    open: false,
    value: '',
    title: ''
  });
  const [eventDataDialog, setEventDataDialog] = useState<{ open: boolean; value: string; title: string }>({
    open: false,
    value: '',
    title: ''
  });
  // Contract execution dialog state
  const [selectedContract, setSelectedContract] = useState<any | null>(null);
  const [openContractDialog, setOpenContractDialog] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState<string>('');
  const [functionArgs, setFunctionArgs] = useState<string>('');
  const [executionOutput, setExecutionOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  // Code editor state - lifted up to persist across tab switches
  const [editorCode, setEditorCode] = useState('');
  // Examples menu state
  const [examplesAnchorEl, setExamplesAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    const init = async () => {
      // Initialize the block manager
      await blockManager.initialize();
      
      // Set up transaction update callback
      const updateTransactions = () => {
        const txs = blockManager.getTransactions();
        setTransactions(txs);
        updateDeployedContracts(txs);
      };
      
      // Set initial transactions and register callback
      updateTransactions();
      blockManager.onTransactionUpdate(updateTransactions);
      
      // Fallback interval to ensure UI stays in sync
      const interval = setInterval(updateTransactions, 1000);
      
      return () => clearInterval(interval);
    };
    
    const cleanup = init();
    return () => {
      cleanup.then((cleanupFn) => cleanupFn && cleanupFn());
    };
  }, [blockManager]);

  useEffect(() => {
    const updateCurrentBlock = () => {
      setCurrentBlock(blockManager.getCurrentBlock());
    };
    updateCurrentBlock();
    const interval = setInterval(updateCurrentBlock, 1000);
    return () => clearInterval(interval);
  }, [blockManager]);

  // Icon helpers (copied from BlockchainView)
  const getTransactionTypeIcon = (type: string, tx?: Transaction) => {
    switch (type) {
      case 'deployment':
        return '🤝';
      case 'function_call':
        return '▶️';
      case 'contract_call':
        return '🔗';
      case 'eth_transfer':
        return '💸';
      case 'account_creation':
        if (tx && tx.from === '0x0000000000000000000000000000000000000000') {
          return '👑';
        }
        return '👤';
      default:
        return '📄';
    }
  };
  const getTransactionStatusIcon = (status: string) => {
    switch (status) {
      case 'executed':
        return '✅';
      case 'failed':
        return '❌';
      case 'pending':
        return '⏳';
      default:
        return '❓';
    }
  };

  // Detect contract name based on bytecode patterns
  const detectContractName = (tx: Transaction): string | null => {
    if (tx.data) {
      const bytecode = tx.data.toLowerCase();

      // More specific heuristics based on common patterns in the bytecode
      if (bytecode.includes('increment') && bytecode.includes('getcount')) {
        return 'Counter';
      } else if (
        bytecode.includes('add') &&
        bytecode.includes('multiply') &&
        !bytecode.includes('set') &&
        !bytecode.includes('get')
      ) {
        return 'Calculator';
      } else if (
        (bytecode.includes('set') && bytecode.includes('get')) ||
        bytecode.includes('storeddata')
      ) {
        return 'Storage';
      } else if (
        bytecode.includes('hello') ||
        (bytecode.includes('simple') &&
          !bytecode.includes('increment') &&
          !bytecode.includes('add'))
      ) {
        return 'Simple';
      } else if (bytecode.includes('array') || bytecode.includes('addnumber')) {
        return 'ArrayOperations';
      }
    }
    return null;
  };

  // Update deployed contracts from transactions
  const updateDeployedContracts = (transactions: Transaction[]) => {
    const contracts: any[] = [];
    
    transactions.forEach((tx) => {
      if (tx.type === 'deployment' && tx.contractAddress && tx.status === 'executed') {
        let contractName = 'Unknown Contract';
        let abi: any[] = [];

        // Try to get contract info from executor first
        if (executor) {
          const contractInfo = executor.getContractByAddress(tx.contractAddress);
          if (contractInfo) {
            contractName = contractInfo.name;
            abi = contractInfo.abi;
          } else {
            // Fallback to last compiled contract info
            const lastCompiledAbi = (executor as any).lastCompiledAbi;
            const lastCompiledName = (executor as any).lastCompiledName;
            
            if (lastCompiledAbi && lastCompiledName) {
              // Use bytecode detection to determine if this is the right contract
              const detectedName = detectContractName(tx);
              contractName = detectedName || lastCompiledName;
              abi = lastCompiledAbi;
            } else {
              // Final fallback to bytecode detection
              const detectedName = detectContractName(tx);
              contractName = detectedName || `Contract_${tx.contractAddress.slice(0, 8)}`;
            }
          }
        } else {
          // No executor available, use bytecode detection
          const detectedName = detectContractName(tx);
          contractName = detectedName || `Contract_${tx.contractAddress.slice(0, 8)}`;
        }
        
        const contract = {
          address: tx.contractAddress,
          name: contractName,
          deploymentTxId: tx.id,
          abi: abi,
          functions: abi.filter((item: any) => item.type === 'function').map((func: any) => ({
            signature: `${func.name}(${func.inputs.map((input: any) => `${input.type} ${input.name}`).join(', ')}) → ${func.outputs.length > 0 ? func.outputs.map((output: any) => output.type).join(', ') : 'void'}`,
            name: func.name,
            inputs: func.inputs,
            outputs: func.outputs,
            stateMutability: func.stateMutability,
          })),
          deployedAt: tx.timestamp,
        };
        contracts.push(contract);
      }
    });
    
    setDeployedContracts(contracts);
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section)
  }

  const handleCloseTransactionModal = () => {
    setSelectedTx(null);
  };

  const handleContractClick = (contract: any) => {
    // Contract execution is now handled directly in the modal
    // This function is kept for compatibility but no longer navigates
  };

  const handleContractExecute = (contract: any) => {
    setSelectedContract(contract);
    setSelectedFunction('');
    setFunctionArgs('');
    setExecutionOutput('');
    setOpenContractDialog(true);
  };

  const handleReturnValueClick = (value: string, title: string) => {
    setReturnValueDialog({
      open: true,
      value: value,
      title: title
    });
  };

  const handleCloseReturnValueDialog = () => {
    setReturnValueDialog({
      open: false,
      value: '',
      title: ''
    });
  };

  const handleEventDataClick = (data: string, title: string) => {
    setEventDataDialog({
      open: true,
      value: data,
      title: title
    });
  };

  const handleCloseEventDataDialog = () => {
    setEventDataDialog({
      open: false,
      value: '',
      title: ''
    });
  };

  // Examples menu handlers
  const handleExamplesClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setExamplesAnchorEl(event.currentTarget)
  }

  const handleExamplesClose = () => {
    setExamplesAnchorEl(null)
  }

  const handleExampleSelect = (contract: any) => {
    setEditorCode(contract.code)
    handleExamplesClose()
  }

  // Contract execution dialog handlers
  const handleCloseContractDialog = () => {
    setOpenContractDialog(false);
  };

  const handleFunctionChange = (event: any) => {
    setSelectedFunction(event.target.value);
  };

  const handleArgsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFunctionArgs(event.target.value);
  };

  const handleExecuteFunction = async () => {
    if (!selectedFunction || !selectedContract) return;
    setIsExecuting(true);
    setExecutionOutput('');

    try {
      const functionInfo = selectedContract.functions.find(
        (f: any) => f.signature === selectedFunction,
      );
      if (!functionInfo) {
        throw new Error('Function not found');
      }

      let args: any[] = [];
      if (functionArgs.trim() && functionArgs.trim() !== '[]') {
        try {
          args = JSON.parse(functionArgs);
          if (!Array.isArray(args)) {
            throw new Error('Arguments must be an array');
          }
        } catch (parseError) {
          throw new Error('Invalid JSON format for arguments');
        }
      }

      // Validate argument count
      if (args.length !== functionInfo.inputs.length) {
        throw new Error(`Expected ${functionInfo.inputs.length} arguments, got ${args.length}`);
      }

      // Use BlockManager's executeContractFunction method
      const result = await blockManager.executeContractFunction(
        selectedContract.address,
        selectedContract.abi,
        functionInfo.name,
        args,
      );

      if (result.status === 'executed') {
        let output = `✅ Function "${functionInfo.name}" executed successfully!\n`;
        output += `📊 Gas used: ${result.gasUsed.toString()}\n`;
        output += `💰 Gas price: ${result.gasPrice.toString()}\n`;

        if (result.returnValue) {
          output += `📤 Return value: ${result.returnValue}\n`;
        }

        if (result.logs && result.logs.length > 0) {
          output += `📋 Event logs:\n`;
          result.logs.forEach((log, index) => {
            output += `  ${index + 1}. Address: ${log.address}\n`;
            output += `     Topics: ${log.topics.join(', ')}\n`;
            output += `     Data: ${log.data}\n`;
          });
        }

        setExecutionOutput(output);
      } else {
        setExecutionOutput(`❌ Function execution failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      setExecutionOutput(
        `❌ Error: ${error.message || 'An error occurred while executing the function'}`,
      );
    } finally {
      setIsExecuting(false);
    }
  };

  const getContractFunctions = (contract: any) => {
    return contract.functions || [];
  };

  const renderFunctionInfo = (functionInfo: any) => {
    if (!functionInfo) return null;

    return (
      <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Function Details:
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
          {functionInfo.signature}
        </Typography>
        {functionInfo.inputs.length > 0 && (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Parameters:
            </Typography>
            {functionInfo.inputs.map((input: any, index: number) => (
              <Typography key={index} variant="body2" sx={{ fontFamily: 'monospace', ml: 2 }}>
                {input.name}: {input.type}
              </Typography>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  const menuItems = [
    { text: 'Code Editor', icon: <span style={{ fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 'bold' }}>{'{'}{'}'}</span>, section: 'code' },
    { text: 'Accounts', icon: <AccountBalanceWalletIcon />, section: 'accounts' },
  ]

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Condensed AppBar positioned above the sidebar */}
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          width: drawerWidth,
          left: 0,
        }}
      >
        <Toolbar sx={{ minHeight: '48px !important', px: 1 }}>
          <Typography variant="subtitle1" noWrap component="div" sx={{ fontSize: '0.9rem', fontWeight: 500 }}>
            YZ ETH v{packageJson.version}
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Future File Tabs Area - positioned to the right of the sidebar */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: drawerWidth,
          right: 0,
          height: '48px',
          backgroundColor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          zIndex: (theme) => theme.zIndex.drawer,
          display: 'flex',
          alignItems: 'center',
          px: 2,
        }}
      >
        {/* Placeholder for file tabs - will be implemented later */}
        <Typography variant="body2" color="text.secondary">
          File tabs will appear here
        </Typography>
      </Box>

      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? activeSection !== 'code' : true}
        onClose={() => handleSectionChange('code')}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar sx={{ minHeight: '48px !important' }} />
        <Box sx={{ overflow: 'auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Examples Button */}
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Button
              variant="outlined"
              onClick={handleExamplesClick}
              sx={{
                width: '100%',
                borderStyle: 'dashed',
                '&:hover': {
                  borderStyle: 'solid',
                },
              }}
              startIcon={<MenuBookIcon />}
              endIcon={<ArrowDropDownIcon />}
            >
              Examples
            </Button>
            <Menu
              anchorEl={examplesAnchorEl}
              open={Boolean(examplesAnchorEl)}
              onClose={handleExamplesClose}
              PaperProps={{
                style: {
                  maxHeight: '400px',
                  width: '300px',
                },
              }}
            >
              {Object.entries(exampleContracts).map(([category, contracts]) => (
                <Box key={category}>
                  <MenuItem disabled>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {category}
                    </Typography>
                  </MenuItem>
                  {(contracts as any[]).map((contract) => (
                    <MenuItem
                      key={contract.name}
                      onClick={() => handleExampleSelect(contract)}
                      sx={{ pl: 3 }}
                    >
                      {contract.name}
                    </MenuItem>
                  ))}
                </Box>
              ))}
            </Menu>
          </Box>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
                <ListItemButton
                  selected={activeSection === item.section}
                  onClick={() => handleSectionChange(item.section)}
                  sx={{
                    minHeight: 48,
                    justifyContent: isMobile ? 'initial' : 'initial',
                    px: 2.5,
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: isMobile ? 3 : 'auto',
                      justifyContent: 'center',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} sx={{ opacity: isMobile ? 1 : 1 }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider />

          {/* Current Block Info */}
          <Box sx={{ px: 2, py: 1 }}>
            <Paper elevation={2} sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Current Block
              </Typography>
              {currentBlock ? (
                <Box>
                  <Typography variant="body2">
                    <strong>Number:</strong> {currentBlock.blockNumber.toString()}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Gas Used:</strong> {currentBlock.gasUsed.toString()} / {currentBlock.gasLimit.toString()}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Transactions:</strong> {currentBlock.transactions.length}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Timestamp:</strong> {new Date(Number(currentBlock.timestamp) * 1000).toLocaleString()}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No block data available
                </Typography>
              )}
            </Paper>
          </Box>

          {/* YZ Logo */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              py: 4,
              px: 2,
              mt: 2,
            }}
          >
            <img
              src="./yz.png"
              alt="YZ Logo"
              style={{
                width: '120px',
                height: 'auto',
                opacity: 0.3,
                filter: 'grayscale(20%)',
                transition: 'opacity 0.3s ease',
              }}
            />
          </Box>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: '100%', mt: 6, pb: 12 }}>
        {activeSection === 'code' && <CodeEditor executor={executor} blockManager={blockManager} code={editorCode} setCode={setEditorCode} />}
        {activeSection === 'accounts' && <AccountManagement blockManager={blockManager} />}
      </Box>
      <TransactionSliderBar
        transactions={transactions}
        getTransactionTypeIcon={getTransactionTypeIcon}
        getTransactionStatusIcon={getTransactionStatusIcon}
        onTileClick={setSelectedTx}
        selectedTxId={selectedTx?.id}
        deployedContracts={deployedContracts}
        onContractExecute={handleContractExecute}
      />
      
      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        transaction={selectedTx}
        open={!!selectedTx}
        onClose={handleCloseTransactionModal}
        deployedContracts={deployedContracts}
        onContractClick={handleContractClick}
        onReturnValueClick={handleReturnValueClick}
        onEventDataClick={handleEventDataClick}
      />
      
      {/* Return Value Dialog */}
      <Dialog
        open={returnValueDialog.open}
        onClose={handleCloseReturnValueDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{returnValueDialog.title}</DialogTitle>
        <DialogContent>
          <Typography
            variant="body1"
            sx={{
              fontFamily: 'monospace',
              backgroundColor: '#f5f5f5',
              padding: 2,
              borderRadius: 1,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {returnValueDialog.value}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReturnValueDialog}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Event Data Dialog */}
      <Dialog
        open={eventDataDialog.open}
        onClose={handleCloseEventDataDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{eventDataDialog.title}</DialogTitle>
        <DialogContent>
          <Typography
            variant="body1"
            sx={{
              fontFamily: 'monospace',
              backgroundColor: '#f5f5f5',
              padding: 2,
              borderRadius: 1,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {eventDataDialog.value}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEventDataDialog}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Contract Execution Dialog */}
      <Dialog
        open={openContractDialog}
        onClose={handleCloseContractDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '80vh',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>📝</span>
            <Typography variant="h6" component="span">
              Execute Contract Function
            </Typography>
            {selectedContract && (
              <Typography variant="subtitle2" sx={{ ml: 1, opacity: 0.7 }}>
                - {selectedContract.name}
              </Typography>
            )}
          </Box>
          <IconButton onClick={handleCloseContractDialog} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 2 }}>
          {/* Contract Details */}
          <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
              📋 Contract Details
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 1, alignItems: 'start' }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Name:</Typography>
              <Typography variant="body2">{selectedContract?.name || 'Unnamed Contract'}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Address:</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {selectedContract?.address || 'N/A'}
              </Typography>
            </Box>
          </Paper>

          {/* Available Functions */}
          {selectedContract && (
            <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                ⚙️ Available Functions ({selectedContract.functions.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedContract.functions.slice(0, 5).map((func: any) => (
                  <Chip
                    key={func.name}
                    label={func.name}
                    size="small"
                    variant="outlined"
                    color={func.stateMutability === 'view' ? 'info' : 'primary'}
                  />
                ))}
                {selectedContract.functions.length > 5 && (
                  <Chip
                    label={`+${selectedContract.functions.length - 5} more`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            </Paper>
          )}

          {/* Function Execution */}
          <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
              🔧 Function Execution
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Select
                value={selectedFunction}
                onChange={handleFunctionChange}
                displayEmpty
                fullWidth
              >
                <MenuItem value="" disabled>
                  Select a function...
                </MenuItem>
                {selectedContract &&
                  getContractFunctions(selectedContract).map((func: any) => (
                    <MenuItem key={func.signature} value={func.signature}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={func.stateMutability}
                          size="small"
                          color={func.stateMutability === 'view' ? 'info' : 'primary'}
                          sx={{ minWidth: '60px' }}
                        />
                        {func.signature}
                      </Box>
                    </MenuItem>
                  ))}
              </Select>

              {selectedFunction &&
                selectedContract &&
                (() => {
                  const functionInfo = selectedContract.functions.find(
                    (f: any) => f.signature === selectedFunction,
                  );
                  return renderFunctionInfo(functionInfo);
                })()}

              <TextField
                label="Arguments (JSON array)"
                value={functionArgs}
                onChange={handleArgsChange}
                fullWidth
                multiline
                rows={3}
                disabled={!selectedFunction}
                placeholder={
                  selectedFunction
                    ? 'Enter arguments as JSON array, e.g., [123, "hello", true]'
                    : 'Select a function first'
                }
                helperText={
                  selectedFunction
                    ? 'Enter arguments as a JSON array. Use quotes for strings and addresses.'
                    : ''
                }
              />
              
              <Paper
                elevation={2}
                sx={{ p: 2, minHeight: '150px', overflow: 'auto', bgcolor: '#1e1e1e', color: '#fff' }}
              >
                <Typography variant="subtitle2" sx={{ color: '#4caf50', mb: 1 }}>
                  Execution Output:
                </Typography>
                {isExecuting ? (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '100px',
                    }}
                  >
                    <CircularProgress size={24} sx={{ color: '#4caf50' }} />
                    <Typography variant="body2" sx={{ ml: 2, color: '#4caf50' }}>
                      Executing function...
                    </Typography>
                  </Box>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace',
                      fontSize: '0.9rem',
                      lineHeight: 1.4,
                      color: executionOutput.includes('❌') ? '#f44336' : '#fff',
                    }}
                  >
                    {executionOutput ||
                      'No output yet. Select a function and click "Execute" to see results.'}
                  </Typography>
                )}
              </Paper>
            </Box>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={handleExecuteFunction}
            variant="contained"
            disabled={!selectedFunction || isExecuting}
            startIcon={<PlayArrowIcon />}
            sx={{
              bgcolor: '#4caf50',
              '&:hover': { bgcolor: '#45a049' },
              '&:disabled': { bgcolor: '#ccc' },
            }}
          >
            {isExecuting ? 'Executing...' : 'Execute Function'}
          </Button>
          <Button onClick={handleCloseContractDialog} variant="contained" color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
