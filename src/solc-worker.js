// Solidity compiler web worker using solcjs directly
// Loads solc from CDN without wrapper dependency

console.log('[Worker] Loading solc from CDN...')
importScripts('https://binaries.soliditylang.org/bin/soljson-v0.8.19+commit.7dd6d404.js')

let solc = null
let isInitialized = false

// Initialize solc after a short delay to ensure the CDN script has loaded
setTimeout(() => {
  try {
    console.log('[Worker] Checking for solc module...')
    
    // The CDN script creates a global Module object
    if (typeof self.Module !== 'undefined') {
      console.log('[Worker] Module found, initializing solc...')
      
      // Create a simple wrapper around the Module
      solc = {
        compile: function(input) {
          try {
            return self.Module.cwrap('solidity_compile', 'string', ['string', 'number'])(input, 1);
          } catch (e) {
            console.error('[Worker] Compilation error:', e);
            throw e;
          }
        },
        version: function() {
          try {
            return self.Module.cwrap('solidity_version', 'string', [])();
          } catch (e) {
            return "v0.8.19+commit.7dd6d404";
          }
        }
      };
      
      isInitialized = true;
      console.log('[Worker] Solc initialized successfully');
      self.postMessage({ type: 'ready', success: true });
      
    } else {
      console.error('[Worker] Module not found after delay');
      self.postMessage({
        type: 'error',
        success: false,
        error: 'Solc Module not available - CDN loading may have failed'
      });
    }
  } catch (err) {
    console.error('[Worker] Initialization error:', err);
    self.postMessage({
      type: 'error',
      success: false,
      error: 'Failed to initialize solc: ' + err.message
    });
  }
}, 500); // Give CDN script time to load

self.addEventListener('message', function (event) {
  if (!solc || !isInitialized) {
    console.error('[Worker] Compilation requested but solc not ready')
    self.postMessage({ 
      type: 'compileResult', 
      success: false, 
      error: 'Solc not initialized or not ready',
      contractName: event.data.contractName,
      requestId: event.data.requestId
    })
    return
  }
  
  const { type, input, contractName, requestId } = event.data
  
  if (type === 'compile') {
    try {
      console.log(`[Worker] Compiling ${contractName || 'unknown'} (${requestId || 'no-id'})`)
      
      const output = JSON.parse(solc.compile(JSON.stringify(input)))
      
      // Check for compilation errors
      if (output.errors) {
        const errors = output.errors.filter(error => error.severity === 'error')
        if (errors.length > 0) {
          self.postMessage({ 
            type: 'compileResult', 
            success: false, 
            error: errors.map(e => e.formattedMessage || e.message).join('\n'),
            contractName,
            requestId
          })
          return
        }
      }
      
      console.log(`[Worker] Compilation successful for ${contractName || 'unknown'}`)
      
      self.postMessage({ 
        type: 'compileResult', 
        success: true, 
        output,
        contractName,
        requestId
      })
      
    } catch (err) {
      console.error(`[Worker] Compilation failed for ${contractName || 'unknown'}:`, err)
      
      self.postMessage({ 
        type: 'compileResult', 
        success: false, 
        error: err.message,
        contractName,
        requestId
      })
    }
  } else if (type === 'version') {
    try {
      const version = solc.version()
      self.postMessage({ type: 'versionResult', success: true, version })
    } catch (err) {
      self.postMessage({ type: 'error', success: false, error: err.message })
    }
  } else {
    self.postMessage({ type: 'error', success: false, error: 'Unknown message type: ' + type })
  }
})
