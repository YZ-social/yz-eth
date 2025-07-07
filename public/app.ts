import { BlockManager, Transaction } from '../src/blockManager.ts'
import { SolidityExecutor } from '../src/solidityExecutor.ts'

const tileLeft = document.getElementById('tileLeft') as HTMLElement
const tileBlockBuilder = document.getElementById('tileBlockBuilder') as HTMLElement

class SimpleApp {
  private executor: SolidityExecutor
  private blockManager: BlockManager
  private outputElement: HTMLElement
  private inputElement: HTMLTextAreaElement
  private executeBtn: HTMLButtonElement
  private clearBtn: HTMLButtonElement
  private resetBtn: HTMLButtonElement
  private transactionPanel: HTMLElement
  private blockInfoPanel: HTMLElement
  private accountsPanel: HTMLElement
  private ethTransferPanel: HTMLElement
  private logsPanel: HTMLElement
  private commandHistory: string[] = []
  private historyIndex: number = -1
  private selectedContract: { address: string; abi: any[] } | null = null

  constructor() {
    this.blockManager = new BlockManager()
    this.executor = new SolidityExecutor(this.blockManager)
    this.outputElement = document.getElementById('output') as HTMLElement
    this.inputElement = document.getElementById('codeInput') as HTMLTextAreaElement
    this.executeBtn = document.getElementById('executeBtn') as HTMLButtonElement
    this.clearBtn = document.getElementById('clearBtn') as HTMLButtonElement
    this.resetBtn = document.getElementById('resetBtn') as HTMLButtonElement
    this.transactionPanel = document.getElementById('transactionPanel') as HTMLElement
    this.blockInfoPanel = document.getElementById('blockInfoPanel') as HTMLElement
    this.accountsPanel = document.getElementById('accountsPanel') as HTMLElement
    this.ethTransferPanel = document.getElementById('ethTransferPanel') as HTMLElement
    this.logsPanel = document.getElementById('logsPanel') as HTMLElement

    this.initializeEventListeners()
    this.loadExamples()
    this.printWelcome()
    this.initializeBlock()
  }

  private initializeEventListeners() {
    // Handle Ctrl+Enter for code execution
    this.inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        this.executeCode()
      } else if (e.key === 'ArrowUp' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        this.navigateHistory('up')
      } else if (e.key === 'ArrowDown' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        this.navigateHistory('down')
      }
    })

    // Handle examples modal
    const examplesBtn = document.getElementById('examplesBtn')
    const examplesModal = document.getElementById('examplesModal')
    const closeBtn = document.querySelector('.close')

    if (examplesBtn && examplesModal) {
      examplesBtn.addEventListener('click', () => {
        examplesModal.style.display = 'block'
      })
    }

    if (closeBtn && examplesModal) {
      closeBtn.addEventListener('click', () => {
        examplesModal.style.display = 'none'
      })
    }

    // Close modal when clicking outside
    if (examplesModal) {
      examplesModal.addEventListener('click', (e) => {
        if (e.target === examplesModal) {
          examplesModal.style.display = 'none'
        }
      })
    }

    // Handle accounts modal
    const accountsBtn = document.getElementById('accountsBtn')
    const accountsModal = document.getElementById('accountsModal')
    const closeAccountsBtn = document.querySelector('.close-accounts')

    if (accountsBtn && accountsModal) {
      accountsBtn.addEventListener('click', () => {
        accountsModal.style.display = 'block'
        // Update panel when modal opens
        this.updateAccountsPanel()
      })
    }

    if (closeAccountsBtn && accountsModal) {
      closeAccountsBtn.addEventListener('click', () => {
        accountsModal.style.display = 'none'
      })
    }

    // Close accounts modal when clicking outside
    if (accountsModal) {
      accountsModal.addEventListener('click', (e) => {
        if (e.target === accountsModal) {
          accountsModal.style.display = 'none'
        }
      })
    }

    // Handle transfer modal
    const transferBtn = document.getElementById('transferBtn')
    const transferModal = document.getElementById('transferModal')
    const closeTransferBtn = document.querySelector('.close-transfer')

    if (transferBtn && transferModal) {
      transferBtn.addEventListener('click', () => {
        transferModal.style.display = 'block'
        // Update panel when modal opens
        this.updateEthTransferPanel()
      })
    }

    if (closeTransferBtn && transferModal) {
      closeTransferBtn.addEventListener('click', () => {
        transferModal.style.display = 'none'
      })
    }

    // Close transfer modal when clicking outside
    if (transferModal) {
      transferModal.addEventListener('click', (e) => {
        if (e.target === transferModal) {
          transferModal.style.display = 'none'
        }
      })
    }

    // Handle paste events to preserve newlines
    this.inputElement.addEventListener('paste', (e) => {
      e.preventDefault()
      const pastedText = e.clipboardData?.getData('text/plain') || ''

      // Normalize line endings and preserve newlines
      const normalizedText = pastedText
        .replace(/\r\n/g, '\n') // Windows line endings
        .replace(/\r/g, '\n') // Mac line endings

      // Insert the text at cursor position
      const start = this.inputElement.selectionStart
      const end = this.inputElement.selectionEnd
      const currentValue = this.inputElement.value

      this.inputElement.value =
        currentValue.substring(0, start) + normalizedText + currentValue.substring(end)

      // Set cursor position after the pasted text
      const newCursorPos = start + normalizedText.length
      this.inputElement.setSelectionRange(newCursorPos, newCursorPos)
    })

    // Auto-resize textarea
    this.inputElement.addEventListener('input', () => {
      this.autoResize()
    })

    // Reset history index when user starts typing
    this.inputElement.addEventListener('keydown', (e) => {
      // Reset history index when user types (but not for navigation keys)
      if (!['ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) {
        this.historyIndex = this.commandHistory.length
      }
    })

    // Handle clear button
    this.clearBtn.addEventListener('click', () => {
      this.clearOutput()
    })

    // Handle reset button
    this.resetBtn.addEventListener('click', async () => {
      await this.resetState()
    })

    // Handle execute button
    this.executeBtn.addEventListener('click', () => {
      // Add visual feedback
      const originalText = this.executeBtn.textContent
      const originalBg = this.executeBtn.style.backgroundColor

      this.executeBtn.style.backgroundColor = '#4CAF50'
      this.executeBtn.textContent = 'Executing...'
      this.executeBtn.disabled = true

      // Execute the code
      this.executeCode()

      // Reset button after a short delay
      setTimeout(() => {
        this.executeBtn.style.backgroundColor = originalBg
        this.executeBtn.textContent = originalText
        this.executeBtn.disabled = false
      }, 1000)
    })

    // Focus input on page load
    window.addEventListener('load', () => {
      this.inputElement.focus()
    })
  }

  private autoResize() {
    this.inputElement.style.height = 'auto'
    const scrollHeight = this.inputElement.scrollHeight
    const minHeight = 60
    const maxHeight = 200

    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight)
    this.inputElement.style.height = `${newHeight}px`
  }

  private loadExamples() {
    const exampleButtons = document.querySelectorAll('.example-btn')

    exampleButtons.forEach((btn, index) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()

        // Add immediate visual feedback
        const button = e.target as HTMLElement
        button.style.backgroundColor = '#4CAF50'
        setTimeout(() => {
          button.style.backgroundColor = ''
        }, 200)

        const exampleType = (btn as HTMLElement).dataset.example
        if (exampleType) {
          this.printMessage(`🔘 Button clicked: ${exampleType}`, 'output')
          this.loadExample(exampleType)
          // Close the modal after selecting an example
          const examplesModal = document.getElementById('examplesModal')
          if (examplesModal) {
            examplesModal.style.display = 'none'
          }
        }
      })
    })
  }

  private loadExample(type: string) {
    const examples: Record<string, string> = {
      simple: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Simple {
    function main() public pure returns (string memory) {
        return "Hello from EthereumJS!";
    }
}`,
      counter: `// SPDX-License-Identifier: MIT
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
      calculator: `// SPDX-License-Identifier: MIT
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
      storage: `// SPDX-License-Identifier: MIT
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
      arrays: `// SPDX-License-Identifier: MIT
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
      mappings: `// SPDX-License-Identifier: MIT
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
      structs: `// SPDX-License-Identifier: MIT
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
      events: `// SPDX-License-Identifier: MIT
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
      modifiers: `// SPDX-License-Identifier: MIT
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
      inheritance: `// SPDX-License-Identifier: MIT
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
      interfaces: `// SPDX-License-Identifier: MIT
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
      library: `// SPDX-License-Identifier: MIT
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
      enums: `// SPDX-License-Identifier: MIT
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
      errors: `// SPDX-License-Identifier: MIT
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
      gas: `// SPDX-License-Identifier: MIT
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
    }

    const code = examples[type]
    if (code) {
      this.inputElement.value = code
      this.autoResize()
      this.inputElement.focus()
      this.printMessage(`📝 Loaded example: ${type}`, 'output')
      this.printMessage(
        `Ready to execute! Click "Execute" or press Ctrl+Enter to run the contract.`,
        'output',
      )
    }
  }

  private async executeCode() {
    const code = this.inputElement.value.trim()
    if (!code) return

    // Add to history
    this.addToHistory(code)

    // Clear input and reset height
    this.inputElement.value = ''
    this.autoResize()

    // Display input
    this.printMessage(`> ${code}`, 'input')

    try {
      // Show loading indicator
      const loadingId = this.printMessage('🔄 Compiling and executing...', 'output')

      // Execute the code
      const result = await this.executor.executeSolidity(code)

      // Remove loading indicator
      this.removeMessage(loadingId)

      // Update transaction panel and block info
      this.updateTransactionPanel()
      this.updateBlockInfo()
      this.updateAccountsPanel()
      this.updateEthTransferPanel()
      this.updateLogsPanel()

      // Display result
      if (result.success) {
        this.printMessage(`✅ Execution successful!`, 'success')
        this.printMessage(`📊 Gas used: ${result.gasUsed.toString()}`, 'output')
        this.printMessage(`📤 Output: ${result.output}`, 'output')
        if (result.logs.length > 0) {
          this.printMessage(`📋 Logs:\n${result.logs.join('\n')}`, 'output')
        }
        if (result.contractAddress) {
          this.printMessage(`🏗️ Contract deployed at: ${result.contractAddress}`, 'output')
        }
      } else {
        this.printMessage(`❌ Execution failed: ${result.error}`, 'error')
      }
    } catch (error) {
      this.printMessage(
        `❌ Execution failed: ${error instanceof Error ? error.message : String(error)}`,
        'error',
      )
    }
  }

  private addToHistory(command: string) {
    // Don't add duplicate consecutive commands
    if (this.commandHistory[this.commandHistory.length - 1] !== command) {
      this.commandHistory.push(command)
    }
    this.historyIndex = this.commandHistory.length
  }

  private navigateHistory(direction: 'up' | 'down') {
    // If user is typing something new, save it temporarily
    const currentInput = this.inputElement.value.trim()

    if (direction === 'up' && this.historyIndex > 0) {
      this.historyIndex--
      this.inputElement.value = this.commandHistory[this.historyIndex]
    } else if (direction === 'down' && this.historyIndex < this.commandHistory.length - 1) {
      this.historyIndex++
      this.inputElement.value = this.commandHistory[this.historyIndex]
    } else if (direction === 'down' && this.historyIndex === this.commandHistory.length - 1) {
      this.historyIndex++
      this.inputElement.value = ''
    }

    // Auto-resize and move cursor to end
    this.autoResize()
    this.inputElement.setSelectionRange(
      this.inputElement.value.length,
      this.inputElement.value.length,
    )
  }

  private printMessage(message: string, type: 'input' | 'output' | 'error' | 'success'): string {
    const messageElement = document.createElement('div')
    messageElement.className = `message ${type}`
    messageElement.textContent = message

    const id = Date.now().toString()
    messageElement.id = id

    const output = document.getElementById('output')
    if (output) {
      output.appendChild(messageElement)
      output.scrollTop = output.scrollHeight
    } else {
      console.warn('Output element not found!')
    }

    return id
  }

  private removeMessage(id: string) {
    const element = document.getElementById(id)
    if (element) {
      element.remove()
    }
  }

  private clearOutput() {
    this.outputElement.innerHTML = ''
    this.printWelcome()
  }

  private async resetState() {
    try {
      await this.blockManager.reset()
      this.updateTransactionPanel()
      this.updateBlockInfo()
      this.updateAccountsPanel()
      this.updateEthTransferPanel()
      this.updateLogsPanel()
      this.printMessage('✅ Block and state reset successfully', 'success')
    } catch (error) {
      this.printMessage(
        `❌ Failed to reset state: ${error instanceof Error ? error.message : String(error)}`,
        'error',
      )
    }
  }

  private async initializeBlock() {
    try {
      await this.blockManager.initialize()
      this.updateBlockInfo()
      this.updateAccountsPanel()
      this.updateEthTransferPanel()
      this.updateLogsPanel()
      this.printMessage('🔗 Block initialized successfully!', 'success')
    } catch (error) {
      this.printMessage(
        `❌ Failed to initialize block: ${error instanceof Error ? error.message : String(error)}`,
        'error',
      )
    }
  }

  private updateBlockInfo() {
    const block = this.blockManager.getCurrentBlock()
    if (this.blockInfoPanel) {
      this.blockInfoPanel.innerHTML = `
        <div class="block-info">
          <h3>📦 Current Block</h3>
          <div class="block-details">
            <div><strong>Number:</strong> ${block.blockNumber.toString()}</div>
            <div><strong>Gas Used:</strong> ${block.gasUsed.toString()} / ${block.gasLimit.toString()}</div>
            <div><strong>Transactions:</strong> ${block.transactions.length}</div>
            <div><strong>Timestamp:</strong> ${new Date(Number(block.timestamp) * 1000).toLocaleString()}</div>
          </div>
        </div>
      `
    } else {
      console.warn('blockInfoPanel is null')
    }
  }

  private updateTransactionPanel() {
    const transactions = this.blockManager.getTransactions()
    if (this.transactionPanel) {
      this.transactionPanel.innerHTML = `
        <div class="transaction-list">
          <h3>📋 Transactions (${transactions.length})</h3>
          ${transactions.map((tx) => this.renderTransaction(tx)).join('')}
        </div>
      `
    } else {
      console.warn('transactionPanel is null')
    }
  }

  private renderTransaction(tx: Transaction): string {
    const statusIcon = tx.status === 'executed' ? '✅' : tx.status === 'failed' ? '❌' : '⏳'
    const typeIcon = tx.type === 'deployment' ? '🏗️' : '📞'

    return `
      <div class="transaction-item ${tx.status}" data-tx-id="${tx.id}">
        <div class="tx-header">
          <span class="tx-icon">${typeIcon}</span>
          <span class="tx-id">${tx.id}</span>
          <span class="tx-status">${statusIcon}</span>
        </div>
        <div class="tx-details">
          <div><strong>Type:</strong> ${tx.type}</div>
          <div><strong>Gas Used:</strong> ${tx.gasUsed.toString()}</div>
          ${tx.contractAddress ? `<div><strong>Contract:</strong> ${tx.contractAddress.slice(0, 10)}...</div>` : ''}
          ${tx.functionName ? `<div><strong>Function:</strong> ${tx.functionName}</div>` : ''}
          ${tx.returnValue ? `<div><strong>Return:</strong> ${tx.returnValue}</div>` : ''}
          ${tx.error ? `<div class="tx-error"><strong>Error:</strong> ${tx.error}</div>` : ''}
        </div>
        ${
          tx.type === 'deployment' && tx.contractAddress
            ? `
          <button class="select-contract-btn" onclick="window.app.selectContract('${tx.contractAddress}')">
            Select Contract
          </button>
        `
            : ''
        }
      </div>
    `
  }

  public selectContract(address: string) {
    // Find the contract's ABI from the deployment transaction
    const transactions = this.blockManager.getTransactions()
    const deploymentTx = transactions.find(
      (tx) => tx.type === 'deployment' && tx.contractAddress === address,
    )

    if (deploymentTx) {
      // Get the contract ABI from the compilation result
      // For now, we'll use a basic ABI - in a real implementation, you'd store the full ABI
      const basicAbi = this.getBasicContractAbi()
      this.selectedContract = { address, abi: basicAbi }
      this.showContractInterface(address, basicAbi)
    }
  }

  private getBasicContractAbi(): any[] {
    // Return a basic ABI with common function patterns
    // In a real implementation, this would come from the actual contract compilation
    return [
      {
        type: 'function',
        name: 'increment',
        inputs: [],
        outputs: [],
        stateMutability: 'nonpayable',
      },
      {
        type: 'function',
        name: 'getCount',
        inputs: [],
        outputs: [{ type: 'uint256', name: '' }],
        stateMutability: 'view',
      },
      {
        type: 'function',
        name: 'set',
        inputs: [{ type: 'uint256', name: 'x' }],
        outputs: [],
        stateMutability: 'nonpayable',
      },
      {
        type: 'function',
        name: 'get',
        inputs: [],
        outputs: [{ type: 'uint256', name: '' }],
        stateMutability: 'view',
      },
      {
        type: 'function',
        name: 'addNumber',
        inputs: [{ type: 'uint256', name: 'num' }],
        outputs: [],
        stateMutability: 'nonpayable',
      },
      {
        type: 'function',
        name: 'getNumbers',
        inputs: [],
        outputs: [{ type: 'uint256[]', name: '' }],
        stateMutability: 'view',
      },
      {
        type: 'function',
        name: 'sum',
        inputs: [],
        outputs: [{ type: 'uint256', name: '' }],
        stateMutability: 'view',
      },
      {
        type: 'function',
        name: 'setBalance',
        inputs: [
          { type: 'address', name: 'user' },
          { type: 'uint256', name: 'amount' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
      },
      {
        type: 'function',
        name: 'getBalance',
        inputs: [{ type: 'address', name: 'user' }],
        outputs: [{ type: 'uint256', name: '' }],
        stateMutability: 'view',
      },
      {
        type: 'function',
        name: 'addPerson',
        inputs: [
          { type: 'string', name: 'name' },
          { type: 'uint256', name: 'age' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
      },
      {
        type: 'function',
        name: 'getPerson',
        inputs: [{ type: 'uint256', name: 'index' }],
        outputs: [
          { type: 'string', name: 'name' },
          { type: 'uint256', name: 'age' },
          { type: 'bool', name: 'isActive' },
        ],
        stateMutability: 'view',
      },
    ]
  }

  private showContractInterface(address: string, abi: any[]) {
    const contractPanel = document.getElementById('contractInterface')
    if (contractPanel) {
      // Filter only function types from ABI
      const functions = abi.filter((item) => item.type === 'function')

      // Create function options for dropdown
      const functionOptions = functions
        .map((func) => {
          const inputs = func.inputs.map((input: any) => `${input.type} ${input.name}`).join(', ')
          const outputs =
            func.outputs.length > 0
              ? func.outputs.map((output: any) => output.type).join(', ')
              : 'void'
          return `<option value="${func.name}" data-inputs='${JSON.stringify(func.inputs)}'>${func.name}(${inputs}) → ${outputs}</option>`
        })
        .join('')

      contractPanel.innerHTML = `
        <div class="contract-interface">
          <h3>📞 Contract Interface</h3>
          <div class="contract-address">${address}</div>
          <div class="function-input">
            <label>Function:</label>
            <select id="functionSelect" onchange="window.app.onFunctionSelect()">
              <option value="">Select a function...</option>
              ${functionOptions}
            </select>
          </div>
          <div class="function-input">
            <label>Arguments (JSON array):</label>
            <input type="text" id="functionArgs" placeholder='e.g., [5, "hello"]' disabled>
            <div id="parameterInfo" class="parameter-info"></div>
          </div>
          <button onclick="window.app.executeContractFunction()" disabled id="contractExecuteBtn">Execute Function</button>
        </div>
      `
    } else {
      console.warn('contractPanel is null')
    }
  }

  public onFunctionSelect() {
    const functionSelect = document.getElementById('functionSelect') as HTMLSelectElement
    const argsInput = document.getElementById('functionArgs') as HTMLInputElement
    const executeBtn = document.getElementById('contractExecuteBtn') as HTMLButtonElement
    const parameterInfo = document.getElementById('parameterInfo') as HTMLElement

    if (!functionSelect || !argsInput || !executeBtn || !parameterInfo) return

    const selectedValue = functionSelect.value
    const selectedOption = functionSelect.selectedOptions[0]

    if (!selectedValue) {
      argsInput.disabled = true
      executeBtn.disabled = true
      parameterInfo.innerHTML = ''
      return
    }

    // Get function inputs from data attribute
    const inputs = selectedOption.dataset.inputs ? JSON.parse(selectedOption.dataset.inputs) : []

    // Enable inputs and button
    argsInput.disabled = false
    executeBtn.disabled = false

    // Show parameter information
    if (inputs.length === 0) {
      parameterInfo.innerHTML = '<span class="parameter-hint">No parameters required</span>'
      argsInput.placeholder = '[]'
    } else {
      const paramList = inputs
        .map((input: any, index: number) => `${index + 1}. ${input.type} ${input.name}`)
        .join('<br>')
      parameterInfo.innerHTML = `
        <span class="parameter-hint">Required parameters:</span><br>
        ${paramList}
      `

      // Create example placeholder
      const exampleArgs = inputs.map((input: any) => {
        switch (input.type) {
          case 'uint256':
            return '0'
          case 'int256':
            return '0'
          case 'address':
            return '"0x1234567890123456789012345678901234567890"'
          case 'string':
            return '"example"'
          case 'bool':
            return 'true'
          case 'bytes':
            return '"0x"'
          default:
            return 'null'
        }
      })
      argsInput.placeholder = `[${exampleArgs.join(', ')}]`
    }
  }

  public async executeContractFunction() {
    if (!this.selectedContract) return

    const functionSelect = document.getElementById('functionSelect') as HTMLSelectElement
    const argsInput = document.getElementById('functionArgs') as HTMLInputElement

    if (!functionSelect || !argsInput) return

    const functionName = functionSelect.value
    const argsInputValue = argsInput.value

    if (!functionName) {
      this.printMessage('❌ Please select a function', 'error')
      return
    }

    // Validate arguments
    let args: any[] = []
    if (argsInputValue.trim()) {
      try {
        args = JSON.parse(argsInputValue)
        if (!Array.isArray(args)) {
          throw new Error('Arguments must be an array')
        }
      } catch (error) {
        this.printMessage('❌ Invalid arguments format. Use JSON array like [5, "hello"]', 'error')
        return
      }
    }

    // Validate argument count and types
    const selectedOption = functionSelect.selectedOptions[0]
    const inputs = selectedOption.dataset.inputs ? JSON.parse(selectedOption.dataset.inputs) : []

    if (args.length !== inputs.length) {
      this.printMessage(
        `❌ Function expects ${inputs.length} arguments, but ${args.length} were provided`,
        'error',
      )
      return
    }

    // Validate argument types
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i]
      const arg = args[i]
      const validationError = this.validateArgumentType(arg, input.type)
      if (validationError) {
        this.printMessage(`❌ Parameter ${i + 1} (${input.name}): ${validationError}`, 'error')
        return
      }
    }

    try {
      const tx = await this.blockManager.executeContractFunction(
        this.selectedContract.address,
        this.selectedContract.abi,
        functionName,
        args,
      )

      this.updateTransactionPanel()
      this.updateBlockInfo()
      this.updateAccountsPanel()
      this.updateEthTransferPanel()
      this.updateLogsPanel()

      if (tx.status === 'executed') {
        this.printMessage(`✅ Function ${functionName} executed successfully!`, 'success')
        if (tx.returnValue) {
          this.printMessage(`📤 Return value: ${tx.returnValue}`, 'output')
        }
      } else {
        this.printMessage(`❌ Function execution failed: ${tx.error}`, 'error')
      }
    } catch (error) {
      this.printMessage(
        `❌ Function execution failed: ${error instanceof Error ? error.message : String(error)}`,
        'error',
      )
    }
  }

  private validateArgumentType(arg: any, expectedType: string): string | null {
    switch (expectedType) {
      case 'uint256':
      case 'uint8':
      case 'uint16':
      case 'uint32':
      case 'uint64':
      case 'uint128':
        if (typeof arg !== 'number' || !Number.isInteger(arg) || arg < 0) {
          return `Expected non-negative integer, got ${typeof arg}`
        }
        break

      case 'int256':
      case 'int8':
      case 'int16':
      case 'int32':
      case 'int64':
      case 'int128':
        if (typeof arg !== 'number' || !Number.isInteger(arg)) {
          return `Expected integer, got ${typeof arg}`
        }
        break

      case 'address':
        if (typeof arg !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(arg)) {
          return `Expected valid Ethereum address (0x followed by 40 hex characters)`
        }
        break

      case 'string':
        if (typeof arg !== 'string') {
          return `Expected string, got ${typeof arg}`
        }
        break

      case 'bool':
        if (typeof arg !== 'boolean') {
          return `Expected boolean, got ${typeof arg}`
        }
        break

      case 'bytes':
        if (typeof arg !== 'string' || !arg.startsWith('0x')) {
          return `Expected hex string starting with 0x`
        }
        break

      default:
        // For complex types like arrays, we'll be more lenient
        break
    }

    return null
  }

  private printWelcome() {
    this.printMessage(
      `
🚀 Welcome to EthereumJS Interactive Block Builder!

This is a web-based Solidity execution environment with interactive block creation.

Features:
• Execute Solidity contracts in your browser
• Real-time compilation and execution
• Interactive block building with transaction tracking
• Multi-line textarea with newline preservation
• Terminal-like interface with command history
• 15+ example contracts from beginner to advanced

Try typing or pasting some Solidity code and:
• Click the "Execute" button, or
• Press Ctrl+Enter to execute it!
Use ↑/↓ arrow keys to navigate through your command history.

Watch transactions appear in the right panel as you execute contracts!
    `.trim(),
      'output',
    )
  }

  private updateAccountsPanel() {
    const accounts = this.blockManager.getAccounts()
    if (this.accountsPanel) {
      this.accountsPanel.innerHTML = `
        <div class="accounts-list">
          <h3>👥 Accounts (${accounts.length})</h3>
          <div class="account-controls">
            <button id="createAccountBtn" class="btn btn-primary">Create New Account</button>
            <input type="number" id="initialBalance" placeholder="Initial balance (ETH)" value="0" step="0.01" min="0">
          </div>
          ${accounts.map((account) => this.renderAccount(account)).join('')}
        </div>
      `
    } else {
      console.warn('accountsPanel is null')
    }

    // Add event listener for create account button
    const createAccountBtn = document.getElementById('createAccountBtn')
    if (createAccountBtn) {
      createAccountBtn.addEventListener('click', () => this.createNewAccount())
    }
  }

  private renderAccount(account: any): string {
    const balanceEth = Number(account.balance) / 1e18
    const isContract = account.isContract ? '🏗️ Contract' : '👤 EOA'

    return `
      <div class="account-item">
        <div class="account-address">${account.address}</div>
        <div class="account-balance">${balanceEth.toFixed(4)} ETH</div>
        <div class="account-nonce">Nonce: ${account.nonce.toString()} | ${isContract}</div>
      </div>
    `
  }

  private async createNewAccount() {
    try {
      const initialBalanceInput = document.getElementById('initialBalance') as HTMLInputElement
      const initialBalance = BigInt(Math.floor(Number(initialBalanceInput.value) * 1e18))

      const address = await this.blockManager.createAccount(initialBalance)

      this.updateAccountsPanel()
      this.updateEthTransferPanel()
      this.updateBlockInfo()
      this.printMessage(`✅ New account created: ${address}`, 'success')
    } catch (error) {
      this.printMessage(
        `❌ Failed to create account: ${error instanceof Error ? error.message : String(error)}`,
        'error',
      )
    }
  }

  private updateEthTransferPanel() {
    const accounts = this.blockManager.getAccounts()

    if (this.ethTransferPanel) {
      this.ethTransferPanel.innerHTML = `
        <div class="eth-transfer-interface">
          <h3>💸 ETH Transfer</h3>
          <div class="transfer-controls">
            <select id="fromAccount" class="form-control">
              ${accounts.map((account) => `<option value="${account.address}">${account.address.substring(0, 10)}... (${(Number(account.balance) / 1e18).toFixed(4)} ETH)</option>`).join('')}
            </select>
            <select id="toAccount" class="form-control">
              ${accounts.map((account) => `<option value="${account.address}">${account.address.substring(0, 10)}... (${(Number(account.balance) / 1e18).toFixed(4)} ETH)</option>`).join('')}
            </select>
            <input type="number" id="transferAmount" placeholder="Amount (ETH)" value="0.1" step="0.01" min="0" class="form-control">
            <button id="transferBtn" class="btn btn-primary">Transfer ETH</button>
          </div>
        </div>
      `
    } else {
      console.warn('ethTransferPanel is null')
    }

    // Add event listener for transfer button
    const transferBtn = document.getElementById('transferBtn')
    if (transferBtn) {
      transferBtn.addEventListener('click', () => this.executeEthTransfer())
    }
  }

  private async executeEthTransfer() {
    try {
      const fromAccount = (document.getElementById('fromAccount') as HTMLSelectElement).value
      const toAccount = (document.getElementById('toAccount') as HTMLSelectElement).value
      const amountInput = document.getElementById('transferAmount') as HTMLInputElement
      const amount = BigInt(Math.floor(Number(amountInput.value) * 1e18))

      if (fromAccount === toAccount) {
        this.printMessage('❌ Cannot transfer to the same account', 'error')
        return
      }

      const tx = await this.blockManager.transferETH(fromAccount, toAccount, amount)
      this.updateTransactionPanel()
      this.updateAccountsPanel()
      this.updateEthTransferPanel()
      this.updateBlockInfo()
      this.updateLogsPanel()

      if (tx.status === 'executed') {
        this.printMessage(
          `✅ ETH transfer successful! Gas used: ${tx.gasUsed.toString()}`,
          'success',
        )
      } else {
        this.printMessage(`❌ ETH transfer failed: ${tx.error}`, 'error')
      }
    } catch (error) {
      this.printMessage(
        `❌ ETH transfer failed: ${error instanceof Error ? error.message : String(error)}`,
        'error',
      )
    }
  }

  private updateLogsPanel() {
    const logs = this.blockManager.getAllLogs()
    if (this.logsPanel) {
      this.logsPanel.innerHTML = `
        <div class="logs-list">
          <h3>📋 Event Logs (${logs.length})</h3>
          ${logs.map((log) => this.renderLog(log)).join('')}
        </div>
      `
    } else {
      console.warn('logsPanel is null')
    }
  }

  private renderLog(log: any): string {
    return `
      <div class="log-entry">
        <div class="log-address">Address: ${log.address}</div>
        <div class="log-topics">Topics: ${log.topics.map((topic: string) => topic.substring(0, 20) + '...').join(', ')}</div>
        <div class="log-data">Data: ${log.data}</div>
      </div>
    `
  }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, initializing app...')

  const output = document.getElementById('output')
  if (output) {
    output.innerHTML = '<div class="message output">Loading Solidity compiler...</div>'
  }

  try {
    // Initialize the app
    const app = new SimpleApp()

    // Expose app globally for contract interface
    ;(window as any).app = app

    // Test solc loading
    const { SolidityExecutor } = await import('../src/solidityExecutor')
    const executor = new SolidityExecutor()

    // Try to get solc to verify it's working
    try {
      // This will trigger solc loading
      await executor.compileSolidity('pragma solidity ^0.8.0; contract Test {}')

      // If we get here, solc is working
      if (output) {
        output.innerHTML = '<div class="message success">✅ Solidity compiler ready!</div>'
      }
    } catch (solcError) {
      console.warn('Solc loading test failed:', solcError)
      if (output) {
        output.innerHTML =
          '<div class="message warning">⚠️ Solidity compiler loading failed. Some features may not work.</div>'
      }
    }
  } catch (error) {
    console.error('App initialization error:', error)
    if (output) {
      output.innerHTML = '<div class="message error">❌ Failed to initialize application</div>'
    }
  }
})

// === TILE SPLITTER RESIZE LOGIC ===
window.addEventListener('DOMContentLoaded', () => {
  // Vertical Splitter (left/right)
  const tileRoot = document.querySelector('.tile-root') as HTMLElement
  const tileLeft = document.getElementById('tileLeft') as HTMLElement
  const tileRight = document.getElementById('tileRight') as HTMLElement
  const splitterVertical = document.getElementById('splitterVertical') as HTMLElement

  let isDraggingVert = false
  let startX = 0
  let startLeftWidth = 0

  splitterVertical.addEventListener('mousedown', (e) => {
    isDraggingVert = true
    startX = e.clientX
    startLeftWidth = tileLeft.getBoundingClientRect().width
    document.body.style.cursor = 'col-resize'
    e.preventDefault()
  })
  document.addEventListener('mousemove', (e) => {
    if (!isDraggingVert) return
    const dx = e.clientX - startX
    const newLeftWidth = startLeftWidth + dx
    const minLeft = 200
    const minRight = 200
    const totalWidth = tileRoot.getBoundingClientRect().width
    if (newLeftWidth < minLeft || totalWidth - newLeftWidth < minRight) return
    tileLeft.style.width = newLeftWidth + 'px'
    tileRight.style.width = totalWidth - newLeftWidth - splitterVertical.offsetWidth + 'px'
  })
  document.addEventListener('mouseup', () => {
    if (isDraggingVert) {
      isDraggingVert = false
      document.body.style.cursor = ''
    }
  })

  // Touch events for vertical splitter
  splitterVertical.addEventListener('touchstart', (e) => {
    isDraggingVert = true
    startX = e.touches[0].clientX
    startLeftWidth = tileLeft.getBoundingClientRect().width
    document.body.style.cursor = 'col-resize'
    e.preventDefault()
  })
  document.addEventListener('touchmove', (e) => {
    if (!isDraggingVert) return
    const dx = e.touches[0].clientX - startX
    const newLeftWidth = startLeftWidth + dx
    const minLeft = 200
    const minRight = 200
    const totalWidth = tileRoot.getBoundingClientRect().width
    if (newLeftWidth < minLeft || totalWidth - newLeftWidth < minRight) return
    tileLeft.style.width = newLeftWidth + 'px'
    tileRight.style.width = totalWidth - newLeftWidth - splitterVertical.offsetWidth + 'px'
  })
  document.addEventListener('touchend', () => {
    if (isDraggingVert) {
      isDraggingVert = false
      document.body.style.cursor = ''
    }
  })

  // Helper to set heights so panels always fill tile-left
  const setLeftPanelHeights = () => {
    if (!tileLeft || !tileBlockBuilder) return

    // Since we removed the accounts/eth panels, the block builder now takes full height
    tileBlockBuilder.style.flex = '1'
    tileBlockBuilder.style.height = '100%'
  }

  // Removed horizontal splitter logic since accounts/eth panels are now in modal

  // Handle accounts/eth transfer splitter in modal
  const splitterAccountsEth = document.getElementById('splitterAccountsEth') as HTMLElement
  const accountsPanel = document.getElementById('accountsPanel') as HTMLElement
  const ethTransferPanel = document.getElementById('ethTransferPanel') as HTMLElement

  let isDraggingAccountsEth = false
  let startXAccounts = 0
  let startAccountsWidth = 0

  if (splitterAccountsEth && accountsPanel && ethTransferPanel) {
    splitterAccountsEth.addEventListener('mousedown', (e) => {
      isDraggingAccountsEth = true
      startXAccounts = e.clientX
      startAccountsWidth = accountsPanel.getBoundingClientRect().width
      document.body.style.cursor = 'col-resize'
      e.preventDefault()
    })

    document.addEventListener('mousemove', (e) => {
      if (!isDraggingAccountsEth) return
      const dx = e.clientX - startXAccounts
      const newAccountsWidth = startAccountsWidth + dx
      const modalLayout = document.querySelector('.accounts-modal-layout') as HTMLElement
      const containerWidth = modalLayout ? modalLayout.getBoundingClientRect().width : 800
      const splitterWidth = splitterAccountsEth.offsetWidth
      const minWidth = 200

      if (
        newAccountsWidth < minWidth ||
        containerWidth - newAccountsWidth - splitterWidth < minWidth
      )
        return

      accountsPanel.style.flexBasis = newAccountsWidth + 'px'
      ethTransferPanel.style.flexBasis = containerWidth - newAccountsWidth - splitterWidth + 'px'
    })

    document.addEventListener('mouseup', () => {
      if (isDraggingAccountsEth) {
        isDraggingAccountsEth = false
        document.body.style.cursor = ''
      }
    })

    // Initialize panels with equal widths (50/50 split)
    const initializeAccountsPanels = () => {
      const modalLayout = document.querySelector('.accounts-modal-layout') as HTMLElement
      if (modalLayout) {
        console.log('Initializing panels from observer')

        // Reset any existing flex-basis and set equal flex
        accountsPanel.style.flexBasis = ''
        ethTransferPanel.style.flexBasis = ''
        accountsPanel.style.flex = '1'
        ethTransferPanel.style.flex = '1'

        // Ensure panels extend to full height
        accountsPanel.style.height = '100%'
        ethTransferPanel.style.height = '100%'
      }
    }

    // Initialize when modal opens
    const accountsModal = document.getElementById('accountsModal')
    if (accountsModal) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            const modal = mutation.target as HTMLElement
            if (modal.style.display === 'block') {
              // Multiple attempts to ensure proper initialization
              setTimeout(initializeAccountsPanels, 50)
              setTimeout(initializeAccountsPanels, 150)
              setTimeout(initializeAccountsPanels, 300)
            }
          }
        })
      })

      observer.observe(accountsModal, { attributes: true })
    }

    // Also add a global function to center the splitter
    ;(window as any).centerAccountsSplitter = () => {
      const modalLayout = document.querySelector('.accounts-modal-layout') as HTMLElement
      const accountsPanel = document.getElementById('accountsPanel') as HTMLElement
      const ethTransferPanel = document.getElementById('ethTransferPanel') as HTMLElement

      if (modalLayout && accountsPanel && ethTransferPanel) {
        console.log('Centering splitter')

        // Reset any existing flex-basis and set equal flex
        accountsPanel.style.flexBasis = ''
        ethTransferPanel.style.flexBasis = ''
        accountsPanel.style.flex = '1'
        ethTransferPanel.style.flex = '1'
      }
    }
  }

  // Handle right panel splitter
  const splitterHorizontalContract = document.getElementById(
    'splitterHorizontalContract',
  ) as HTMLElement
  const transactionPanel = document.getElementById('transactionPanel') as HTMLElement
  const contractInterface = document.getElementById('contractInterface') as HTMLElement

  let isDraggingContract = false
  let startYContract = 0
  let startTransactionHeight = 0

  if (splitterHorizontalContract && transactionPanel && contractInterface) {
    splitterHorizontalContract.addEventListener('mousedown', (e) => {
      isDraggingContract = true
      startYContract = e.clientY
      startTransactionHeight = transactionPanel.getBoundingClientRect().height
      document.body.style.cursor = 'row-resize'
      e.preventDefault()
    })

    document.addEventListener('mousemove', (e) => {
      if (!isDraggingContract) return
      const dy = e.clientY - startYContract
      const newTransactionHeight = startTransactionHeight + dy
      const containerHeight = tileRight.getBoundingClientRect().height
      const splitterHeight = splitterHorizontalContract.offsetHeight
      const minHeight = 100

      if (
        newTransactionHeight < minHeight ||
        containerHeight - newTransactionHeight - splitterHeight < minHeight
      )
        return

      transactionPanel.style.flexBasis = newTransactionHeight + 'px'
      contractInterface.style.flexBasis =
        containerHeight - newTransactionHeight - splitterHeight + 'px'
    })

    document.addEventListener('mouseup', () => {
      if (isDraggingContract) {
        isDraggingContract = false
        document.body.style.cursor = ''
      }
    })
  }

  // On window resize, always fill the space
  window.addEventListener('resize', () => {
    setLeftPanelHeights()

    // Reset right panel heights to equal split
    if (transactionPanel && contractInterface && splitterHorizontalContract) {
      const containerHeight = tileRight.getBoundingClientRect().height
      const splitterHeight = splitterHorizontalContract.offsetHeight
      const panelHeight = (containerHeight - splitterHeight) / 2

      transactionPanel.style.flexBasis = panelHeight + 'px'
      contractInterface.style.flexBasis = panelHeight + 'px'
    }

    // Reset accounts modal panels to center splitter
    const accountsModal = document.getElementById('accountsModal') as HTMLElement
    if (accountsModal && accountsModal.style.display === 'block') {
      const modalLayout = document.querySelector('.accounts-modal-layout') as HTMLElement
      const accountsPanel = document.getElementById('accountsPanel') as HTMLElement
      const ethTransferPanel = document.getElementById('ethTransferPanel') as HTMLElement

      if (modalLayout && accountsPanel && ethTransferPanel) {
        // Reset any existing flex-basis and set equal flex
        accountsPanel.style.flexBasis = ''
        ethTransferPanel.style.flexBasis = ''
        accountsPanel.style.flex = '1'
        ethTransferPanel.style.flex = '1'
      }
    }
  })

  // Initialize all panels
  setLeftPanelHeights()

  // Initialize right panel heights
  if (transactionPanel && contractInterface && splitterHorizontalContract) {
    const containerHeight = tileRight.getBoundingClientRect().height
    const splitterHeight = splitterHorizontalContract.offsetHeight
    const panelHeight = (containerHeight - splitterHeight) / 2

    transactionPanel.style.flexBasis = panelHeight + 'px'
    contractInterface.style.flexBasis = panelHeight + 'px'
  }
})
