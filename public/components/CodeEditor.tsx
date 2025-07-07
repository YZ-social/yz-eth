import {
  ArrowDropDown as ArrowDropDownIcon,
  Clear as ClearIcon,
  CloudUpload as DeployIcon,
  MenuBook as MenuBookIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material'
import {
  Box,
  Button,
  CircularProgress,
  Menu,
  MenuItem,
  MenuList,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import AceEditor from 'react-ace'
// Removed import for mode-solidity as it's not available by default
// import 'ace-builds/src-noconflict/mode-solidity';
import 'ace-builds/src-noconflict/theme-monokai'
import { BlockManager } from '../../src/blockManager'
import { SolidityExecutor } from '../../src/solidityExecutor'

interface CodeEditorProps {
  executor: SolidityExecutor
  blockManager: BlockManager
}

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
}

export default function CodeEditor({ executor, blockManager }: CodeEditorProps) {
  const [code, setCode] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const editorRef = useRef<any>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [splitterPosition, setSplitterPosition] = useState(50) // Percentage of height for editor
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startY = useRef(0)
  const startSplitterPosition = useRef(50)

  const handleExamplesClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleExamplesClose = () => {
    setAnchorEl(null)
  }

  const handleExampleSelect = (contract: any) => {
    setCode(contract.code)
    handleExamplesClose()
  }

  const handleDeploy = async () => {
    setLoading(true)
    setOutput('')
    try {
      const result = await executor.deploySolidity(code)
      if (result.success) {
        let outputText = '✅ Deployment successful!\n'
        outputText += `📊 Gas used: ${result.gasUsed.toString()}\n`
        outputText += `📤 Output: ${result.output}\n`
        if (result.logs && result.logs.length > 0) {
          outputText += `📋 Logs:\n${result.logs.join('\n')}\n`
        }
        if (result.contractAddress) {
          outputText += `🏗️ Contract deployed at: ${result.contractAddress}\n`
          outputText += `💡 Go to Dashboard to execute contract functions.\n`
        }
        setOutput(outputText)
      } else {
        setOutput(`❌ Deployment failed: ${result.error}`)
      }
    } catch (error: any) {
      setOutput(
        `❌ Deployment failed: ${error.message || 'An error occurred while deploying the contract'}`,
      )
    } finally {
      setLoading(false)
    }
  }

  const handleRun = async () => {
    setLoading(true)
    setOutput('')
    try {
      const result = await executor.executeSolidity(code)
      if (result.success) {
        let outputText = '✅ Execution successful!\n'
        outputText += `📊 Gas used: ${result.gasUsed.toString()}\n`
        outputText += `📤 Output: ${result.output}\n`
        if (result.logs && result.logs.length > 0) {
          outputText += `📋 Logs:\n${result.logs.join('\n')}\n`
        }
        if (result.contractAddress) {
          outputText += `🏗️ Contract deployed at: ${result.contractAddress}\n`
        }
        setOutput(outputText)
      } else {
        setOutput(`❌ Execution failed: ${result.error}`)
      }
    } catch (error: any) {
      setOutput(
        `❌ Execution failed: ${error.message || 'An error occurred while executing the code'}`,
      )
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setCode('')
    setOutput('')
  }

  // Resize editor when splitter position changes
  useEffect(() => {
    if (editorRef.current) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        editorRef.current.editor.resize()
      }, 100)
    }
  }, [splitterPosition])

  // Mouse event handlers for splitter
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return

    e.preventDefault()
    const rect = containerRef.current.getBoundingClientRect()
    const deltaY = e.clientY - startY.current
    const containerHeight = rect.height
    const deltaPercent = (deltaY / containerHeight) * 100
    const newPosition = startSplitterPosition.current + deltaPercent

    // Constrain between 20% and 80%
    const constrainedPosition = Math.min(Math.max(newPosition, 20), 80)
    setSplitterPosition(constrainedPosition)
  }, [])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      isDragging.current = true
      startY.current = e.clientY
      startSplitterPosition.current = splitterPosition
      document.body.style.cursor = 'ns-resize'
      document.body.style.userSelect = 'none'
    },
    [splitterPosition],
  )

  // Setup global mouse event listeners
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 100px)',
        width: '100%',
        p: 2,
      }}
    >
      <Typography variant="h6" gutterBottom>
        Solidity Code Editor
      </Typography>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-start' }}>
        <Button
          variant="outlined"
          onClick={handleExamplesClick}
          sx={{
            mr: 1,
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
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
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
        <Button
          variant="contained"
          startIcon={<DeployIcon />}
          onClick={handleDeploy}
          disabled={loading}
          sx={{ mr: 1 }}
        >
          Deploy Only
        </Button>
        <Button
          variant="outlined"
          startIcon={<PlayArrowIcon />}
          onClick={handleRun}
          disabled={loading}
          sx={{ mr: 1 }}
        >
          Deploy & Run
        </Button>
        <Button variant="outlined" startIcon={<ClearIcon />} onClick={handleClear}>
          Clear
        </Button>
      </Box>
      <Box
        ref={containerRef}
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          width: '100%',
          minHeight: '400px',
        }}
      >
        {/* Editor Panel */}
        <Paper
          elevation={3}
          sx={{
            height: `${splitterPosition}%`,
            mb: 0,
            p: 2,
            overflow: 'hidden',
            width: '100%',
            minHeight: '150px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Code Editor
          </Typography>
          <Box sx={{ flexGrow: 1, minHeight: 0 }}>
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
        </Paper>

        {/* Splitter */}
        <Box
          sx={{
            height: '8px',
            backgroundColor: 'primary.main',
            cursor: 'ns-resize',
            '&:hover': {
              backgroundColor: 'primary.dark',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            },
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              width: '30px',
              height: '3px',
              backgroundColor: 'white',
              borderRadius: '2px',
              opacity: 0.7,
            },
          }}
          onMouseDown={handleMouseDown}
        />

        {/* Output Panel */}
        <Paper
          elevation={3}
          sx={{
            height: `${100 - splitterPosition}%`,
            mt: 0,
            p: 2,
            overflow: 'auto',
            width: '100%',
            minHeight: '150px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Output
          </Typography>
          <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto' }}>
            {loading ? (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                }}
              >
                <CircularProgress />
              </Box>
            ) : (
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  lineHeight: 1.4,
                }}
              >
                {output ||
                  'No output yet.\n• "Deploy Only" - Just deploys the contract to the blockchain\n• "Deploy & Run" - Deploys and automatically runs main/test/run function if available'}
              </Typography>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}
