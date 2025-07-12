// Browser test setup file
// This file provides mocks and setup for browser-based tests

// Mock Worker for browser tests
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((error: ErrorEvent) => void) | null = null
  
  constructor(public scriptURL: string) {}
  
  postMessage(message: any) {
    // For tests, we'll simulate immediate responses
    // In real tests, you might want to provide specific mock responses
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({
          data: { error: 'Mock worker - not implemented in tests' }
        } as MessageEvent)
      }
    }, 0)
  }
  
  terminate() {
    // Mock termination
  }
}

// Add Worker to global scope for happy-dom environment
if (typeof Worker === 'undefined') {
  (globalThis as any).Worker = MockWorker
}

// Mock other browser APIs if needed
if (typeof URL === 'undefined') {
  (globalThis as any).URL = class MockURL {
    constructor(public href: string) {}
    static createObjectURL(blob: Blob) {
      return 'mock-blob-url'
    }
    static revokeObjectURL(url: string) {
      // Mock revoke
    }
  }
} 