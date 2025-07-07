// Solidity compiler web worker using solcjs wrapper
// Loads solc from CDN and wraps it for browser use

importScripts('https://binaries.soliditylang.org/bin/soljson-v0.8.19+commit.7dd6d404.js')

let solc = null
try {
  // solcjs exposes a global 'Module' object
  const wrapper = self.Module ? require('solc/wrapper') : null
  if (wrapper) {
    solc = wrapper(self.Module)
    self.postMessage({ type: 'ready', success: true })
  } else {
    throw new Error('solc wrapper not found')
  }
} catch (err) {
  self.postMessage({
    type: 'error',
    success: false,
    error: 'Failed to initialize solc: ' + err.message,
  })
}

self.addEventListener('message', function (event) {
  if (!solc) {
    self.postMessage({ type: 'error', success: false, error: 'Solc not initialized' })
    return
  }
  const { type, input } = event.data
  if (type === 'compile') {
    try {
      const output = JSON.parse(solc.compile(JSON.stringify(input)))
      self.postMessage({ type: 'compileResult', success: true, output })
    } catch (err) {
      self.postMessage({ type: 'error', success: false, error: err.message })
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
