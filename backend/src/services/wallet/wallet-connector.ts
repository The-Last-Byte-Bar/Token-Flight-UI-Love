import { WalletInfo } from '../../models/wallet.model';

/**
 * Check if Nautilus wallet extension is installed
 * @returns True if Nautilus wallet is detected
 */
export function detectNautilusWallet(): boolean {
  return typeof window !== 'undefined' && 'ergoConnector' in window && 'nautilus' in window.ergoConnector;
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
    // Connect to the wallet
    const connected = await window.ergoConnector.nautilus.connect({
      createErgoObject: true
    });

    if (!connected) {
      throw new Error('Failed to connect to Nautilus wallet');
    }

    // Get wallet addresses
    const addresses = await window.ergo.get_used_addresses();
    const changeAddress = await window.ergo.get_change_address();
    
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
    // Get all unspent boxes from the wallet
    const boxes = await window.ergo.get_utxos();
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
    // Sign the transaction
    return await window.ergo.sign_tx(unsignedTx);
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
    // Submit the transaction
    return await window.ergo.submit_tx(signedTx);
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
    return await window.ergo.get_current_height();
  } catch (error) {
    console.error('Error getting current height:', error);
    throw error;
  }
} 