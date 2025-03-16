import { WalletInfo } from '../../models/wallet.model';

// Type definitions for Ergo wallet connectors
interface ErgoConnector {
  nautilus: {
    connect: (options: { createErgoObject: boolean }) => Promise<boolean>;
  };
}

interface ErgoApi {
  get_used_addresses: () => Promise<string[]>;
  get_change_address: () => Promise<string>;
  get_utxos: () => Promise<any[]>;
  sign_tx: (unsignedTx: any) => Promise<any>;
  submit_tx: (signedTx: any) => Promise<string>;
  get_current_height: () => Promise<number>;
}

// Use conditionals for all browser-specific operations
const isServer = typeof window === 'undefined';

// Safe access to browser objects
const getErgoConnector = (): ErgoConnector | undefined => {
  if (isServer) return undefined;
  return (window as any).ergoConnector;
};

const getErgoApi = (): ErgoApi | undefined => {
  if (isServer) return undefined;
  return (window as any).ergo;
};

/**
 * Check if Nautilus wallet extension is installed
 * @returns True if Nautilus wallet is detected
 */
export function detectNautilusWallet(): boolean {
  if (isServer) return false;
  const connector = getErgoConnector();
  return !!connector && 'nautilus' in connector;
}

/**
 * Connect to Nautilus wallet and retrieve addresses
 * @returns Wallet information
 */
export async function connectNautilusWallet(): Promise<WalletInfo> {
  if (!detectNautilusWallet()) {
    throw new Error('Nautilus wallet not detected');
  }

  try {
    const connector = getErgoConnector();
    if (!connector) throw new Error('Ergo connector not available');

    // Connect to the wallet
    const connected = await connector.nautilus.connect({
      createErgoObject: true
    });

    if (!connected) {
      throw new Error('Failed to connect to Nautilus wallet');
    }

    const ergo = getErgoApi();
    if (!ergo) throw new Error('Ergo API not available');

    // Get wallet addresses
    const addresses = await ergo.get_used_addresses();
    const changeAddress = await ergo.get_change_address();
    
    // Determine the network type based on address prefix
    // Mainnet addresses typically start with '9' while testnet addresses start with '3'
    const networkType = addresses.length > 0 && addresses[0].startsWith('3') ? 'testnet' : 'mainnet';

    return {
      connected: true,
      addresses,
      changeAddress,
      networkType
    };
  } catch (error) {
    console.error('Error connecting to Nautilus wallet:', error);
    throw error;
  }
}

/**
 * Scan wallet for tokens
 * @returns List of tokens in the wallet
 */
export async function scanWalletForTokens() {
  if (!detectNautilusWallet()) {
    throw new Error('Nautilus wallet not detected');
  }

  try {
    const ergo = getErgoApi();
    if (!ergo) throw new Error('Ergo API not available');
    
    // Get all unspent boxes from the wallet
    const boxes = await ergo.get_utxos();
    const tokens = new Map();

    // Extract tokens from boxes
    boxes.forEach((box: any) => {
      if (box.assets && box.assets.length > 0) {
        box.assets.forEach((asset: any) => {
          const { tokenId, amount } = asset;
          
          if (tokens.has(tokenId)) {
            // Add to existing amount
            const existingAmount = tokens.get(tokenId).amount;
            tokens.set(tokenId, {
              tokenId,
              amount: BigInt(existingAmount) + BigInt(amount),
              name: tokens.get(tokenId).name,
              decimals: tokens.get(tokenId).decimals
            });
          } else {
            // Add new token
            tokens.set(tokenId, {
              tokenId,
              amount: BigInt(amount),
              name: asset.name || null,
              decimals: asset.decimals || 0
            });
          }
        });
      }
    });

    return Array.from(tokens.values());
  } catch (error) {
    console.error('Error scanning wallet for tokens:', error);
    throw error;
  }
}

/**
 * Sign a transaction using Nautilus wallet
 * @param unsignedTx Unsigned transaction
 * @returns Signed transaction
 */
export async function signTransaction(unsignedTx: any) {
  if (!detectNautilusWallet()) {
    throw new Error('Nautilus wallet not detected');
  }

  try {
    const ergo = getErgoApi();
    if (!ergo) throw new Error('Ergo API not available');
    
    // Sign the transaction
    return await ergo.sign_tx(unsignedTx);
  } catch (error) {
    console.error('Error signing transaction:', error);
    throw error;
  }
}

/**
 * Submit a signed transaction to the blockchain
 * @param signedTx Signed transaction
 * @returns Transaction ID
 */
export async function submitTransaction(signedTx: any) {
  if (!detectNautilusWallet()) {
    throw new Error('Nautilus wallet not detected');
  }

  try {
    const ergo = getErgoApi();
    if (!ergo) throw new Error('Ergo API not available');
    
    // Submit the transaction
    return await ergo.submit_tx(signedTx);
  } catch (error) {
    console.error('Error submitting transaction:', error);
    throw error;
  }
}

/**
 * Get current blockchain height from the connected wallet
 * @returns Current height
 */
export async function getCurrentHeight() {
  if (!detectNautilusWallet()) {
    throw new Error('Nautilus wallet not detected');
  }

  try {
    const ergo = getErgoApi();
    if (!ergo) throw new Error('Ergo API not available');
    
    return await ergo.get_current_height();
  } catch (error) {
    console.error('Error getting current height:', error);
    throw error;
  }
} 