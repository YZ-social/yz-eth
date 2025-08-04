(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

// Solidity compiler web worker using solcjs directly
// Loads solc from CDN without wrapper dependency

console.log('[Worker] Loading solc from CDN...');
importScripts('https://binaries.soliditylang.org/bin/soljson-v0.8.19+commit.7dd6d404.js');
var solc = null;
var isInitialized = false;

// Initialize solc after a short delay to ensure the CDN script has loaded
setTimeout(function () {
  try {
    console.log('[Worker] Checking for solc module...');

    // The CDN script creates a global Module object
    if (typeof self.Module !== 'undefined') {
      console.log('[Worker] Module found, initializing solc...');

      // Create a simple wrapper around the Module
      solc = {
        compile: function compile(input) {
          try {
            return self.Module.cwrap('solidity_compile', 'string', ['string', 'number'])(input, 1);
          } catch (e) {
            console.error('[Worker] Compilation error:', e);
            throw e;
          }
        },
        version: function version() {
          try {
            return self.Module.cwrap('solidity_version', 'string', [])();
          } catch (e) {
            return "v0.8.19+commit.7dd6d404";
          }
        }
      };
      isInitialized = true;
      console.log('[Worker] Solc initialized successfully');
      self.postMessage({
        type: 'ready',
        success: true
      });
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
    console.error('[Worker] Compilation requested but solc not ready');
    self.postMessage({
      type: 'compileResult',
      success: false,
      error: 'Solc not initialized or not ready',
      contractName: event.data.contractName,
      requestId: event.data.requestId
    });
    return;
  }
  var _event$data = event.data,
    type = _event$data.type,
    input = _event$data.input,
    contractName = _event$data.contractName,
    requestId = _event$data.requestId;
  if (type === 'compile') {
    try {
      console.log("[Worker] Compiling ".concat(contractName || 'unknown', " (").concat(requestId || 'no-id', ")"));
      var output = JSON.parse(solc.compile(JSON.stringify(input)));

      // Check for compilation errors
      if (output.errors) {
        var errors = output.errors.filter(function (error) {
          return error.severity === 'error';
        });
        if (errors.length > 0) {
          self.postMessage({
            type: 'compileResult',
            success: false,
            error: errors.map(function (e) {
              return e.formattedMessage || e.message;
            }).join('\n'),
            contractName: contractName,
            requestId: requestId
          });
          return;
        }
      }
      console.log("[Worker] Compilation successful for ".concat(contractName || 'unknown'));
      self.postMessage({
        type: 'compileResult',
        success: true,
        output: output,
        contractName: contractName,
        requestId: requestId
      });
    } catch (err) {
      console.error("[Worker] Compilation failed for ".concat(contractName || 'unknown', ":"), err);
      self.postMessage({
        type: 'compileResult',
        success: false,
        error: err.message,
        contractName: contractName,
        requestId: requestId
      });
    }
  } else if (type === 'version') {
    try {
      var version = solc.version();
      self.postMessage({
        type: 'versionResult',
        success: true,
        version: version
      });
    } catch (err) {
      self.postMessage({
        type: 'error',
        success: false,
        error: err.message
      });
    }
  } else {
    self.postMessage({
      type: 'error',
      success: false,
      error: 'Unknown message type: ' + type
    });
  }
});

},{}]},{},[1]);
