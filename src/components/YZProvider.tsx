import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

// Multisynq integration types
interface MultisynqState {
  blocks: any[];
  accounts: { address: string; balance: bigint }[];
  contracts: any[];
  pendingTransactions: any[];
  currentBlockNumber: number;
  heartbeatCount: number;
}

interface MultisynqContextType {
  // Connection state
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  
  // Blockchain state
  blockchainState: MultisynqState | null;
  
  // Actions - only publish, no subscribe
  publish: (domain: string, event: string, data: any) => void;
}

const YZContext = createContext<MultisynqContextType | null>(null);

export const useMultisynq = () => {
  const context = useContext(YZContext);
  if (!context) {
    throw new Error('useMultisynq must be used within a YZProvider');
  }
  return context;
};

interface YZProviderProps {
  children: React.ReactNode;
}

declare global {
  interface Window {
    Multisynq: any;
    BlockchainModel: any;
    BlockchainView: any;
    blockchainModelLoaded: boolean;
    blockchainViewLoaded: boolean;
  }
}

export const YZProvider: React.FC<YZProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockchainState, setBlockchainState] = useState<MultisynqState | null>(null);
  
  const sessionRef = useRef<any>(null);
  const hasSetupCompleted = useRef(false);

  const loadMultisynqClient = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.Multisynq) {
        console.log("MultisynqProvider: Multisynq already loaded");
        resolve();
        return;
      }

      // Check if script is already added to prevent duplicates
      const existingScript = document.querySelector('script[src*="@multisynq/client"]');
      if (existingScript) {
        console.log("MultisynqProvider: Multisynq script already in DOM, waiting...");
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Multisynq client')));
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@multisynq/client@latest';
      script.onload = () => {
        console.log("MultisynqProvider: Multisynq client loaded from CDN");
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load Multisynq client'));
      };
      document.head.appendChild(script);
    });
  };

  const loadBlockchainModel = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Determine the correct base path for the BlockchainModel.js file
      const basePath = window.location.pathname.includes('/yz-eth/') ? '/yz-eth' : '';
      const modelPath = `${basePath}/BlockchainModel.js`;
      
      // Check if model script is already loaded
      const existingScript = document.querySelector(`script[src="${modelPath}"]`);
      if (existingScript) {
        console.log("MultisynqProvider: BlockchainModel script already in DOM, waiting...");
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Failed to load BlockchainModel')));
        return;
      }

      const script = document.createElement('script');
      script.src = modelPath;
      script.onload = () => {
        console.log("MultisynqProvider: BlockchainModel loaded");
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load BlockchainModel'));
      };
      document.head.appendChild(script);
    });
  };

  const loadBlockchainView = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Determine the correct base path for the BlockchainView.js file
      const basePath = window.location.pathname.includes('/yz-eth/') ? '/yz-eth' : '';
      const viewPath = `${basePath}/BlockchainView.js`;
      
      // Check if view script is already loaded
      const existingScript = document.querySelector(`script[src="${viewPath}"]`);
      if (existingScript) {
        console.log("MultisynqProvider: BlockchainView script already in DOM, waiting...");
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Failed to load BlockchainView')));
        return;
      }

      const script = document.createElement('script');
      script.src = viewPath;
      script.onload = () => {
        console.log("MultisynqProvider: BlockchainView loaded");
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load BlockchainView'));
      };
      document.head.appendChild(script);
    });
  };

  const setupEventListeners = () => {
    // Setup window events from the BlockchainView bridge
    const handleStateUpdate = (event: CustomEvent) => {
      const newState = event.detail as MultisynqState;
      setBlockchainState(newState);
      console.log("MultisynqProvider: State update received from bridge");
    };

    const handleHeartbeat = (event: CustomEvent) => {
      const heartbeatData = event.detail;
      // Only update heartbeat in existing state, don't trigger full state refresh
      setBlockchainState(prev => prev ? {
        ...prev,
        heartbeatCount: heartbeatData.count || heartbeatData.heartbeat || prev.heartbeatCount
      } : prev);
    };

    // Listen to events from BlockchainView bridge
    window.addEventListener('multisynqstateUpdate', handleStateUpdate as EventListener);
    window.addEventListener('multisynqheartbeat', handleHeartbeat as EventListener);
    window.addEventListener('multisynqsystemheartbeat', handleHeartbeat as EventListener);
    window.addEventListener('multisynqtick', handleHeartbeat as EventListener);
    
    return () => {
      window.removeEventListener('multisynqstateUpdate', handleStateUpdate as EventListener);
      window.removeEventListener('multisynqheartbeat', handleHeartbeat as EventListener);
      window.removeEventListener('multisynqsystemheartbeat', handleHeartbeat as EventListener);
      window.removeEventListener('multisynqtick', handleHeartbeat as EventListener);
    };
  };



  const connectToSession = async (): Promise<void> => {
    try {
      if (!window.Multisynq) {
        throw new Error('Multisynq client not loaded');
      }

      if (!window.BlockchainModel) {
        throw new Error('BlockchainModel not available');
      }

      if (!window.BlockchainView) {
        throw new Error('BlockchainView not available');
      }

      // Ensure both components are properly loaded before joining
      if (!window.blockchainModelLoaded || !window.blockchainViewLoaded) {
        throw new Error('Blockchain components not loaded yet');
      }

      // Add a small delay to ensure registration is complete
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log("MultisynqProvider: Attempting to join session with Model and View...");
      window.Multisynq.App.makeWidgetDock();
      // Use both Model and View (proper Multisynq architecture)
      const session = await window.Multisynq.Session.join({
        apiKey: "2tY4BJ0rxQ1PFm3gv0IpKYdUsQ09jnYyVb799JTULh",
        appId: "com.yz-social.yz-eth-blockchain",
        name: "yz-eth-react",
        password: "password",
        model: window.BlockchainModel,
        view: window.BlockchainView // Use the bridge view
      });

                sessionRef.current = session;
          setIsConnected(true);
          console.log("MultisynqProvider: Session connected with Model and View bridge");
          
          // Request current state for new participants via the View bridge
          console.log("MultisynqProvider: Requesting current blockchain state via bridge...");
          setTimeout(() => {
            sessionRef.current.view.requestState();
          }, 500); // Small delay to ensure everything is initialized
      
    } catch (err: any) {
      console.error("MultisynqProvider: Session connection failed:", err);
      setError(`Session connection failed: ${err.message}`);
      throw err;
    }
  };

  // Publish function - use the View bridge to send events to the model
  const publish = (domain: string, event: string, data: any) => {
    if (!sessionRef.current?.view) {
      console.warn("MultisynqProvider: Cannot publish - session not ready");
      return;
    }

    try {
      // Use specific bridge methods for common actions
      if (domain === "blockchain") {
        switch (event) {
          case "createBlock":
            sessionRef.current.view.createBlock(data);
            break;
          case "executeTransaction":
            sessionRef.current.view.executeTransaction(data);
            break;
          case "deployContract":
            sessionRef.current.view.deployContract(data);
            break;
          default:
            // Fallback to direct publish for other events
            sessionRef.current.view.publish(domain, event, data);
        }
      } else {
        sessionRef.current.view.publish(domain, event, data);
      }
    } catch (err: any) {
      console.error("MultisynqProvider: Publish failed:", err);
    }
  };

  const initialize = async () => {
    if (hasSetupCompleted.current) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Load dependencies in sequence
              await loadMultisynqClient();
        await loadBlockchainModel();
        await loadBlockchainView();
      
      // Setup window event listener for state updates
                const cleanup = setupEventListeners();
      
      // Connect to Multisynq session
      await connectToSession();

      hasSetupCompleted.current = true;

      // Cleanup function for when component unmounts
      return cleanup;
      
    } catch (err: any) {
      console.error("MultisynqProvider: Initialization failed:", err);
      setError(`Initialization failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    initialize().then((cleanupFunc) => {
      cleanup = cleanupFunc;
    });
    
    return () => {
      if (cleanup && typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, []);

  const contextValue: MultisynqContextType = {
    isLoading,
    isConnected,
    error,
    blockchainState,
    publish
  };

  return (
    <YZContext.Provider value={contextValue}>
      {children}
    </YZContext.Provider>
  );
};

export default YZProvider; 