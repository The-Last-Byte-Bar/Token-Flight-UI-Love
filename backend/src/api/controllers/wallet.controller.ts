import { Request, Response } from 'express';
import * as walletService from '../../services/wallet/wallet-connector';
import { scanWalletForCollections } from '../../services/collection/collection-discovery';

/**
 * Check if Nautilus wallet is installed
 * @param req Request object
 * @param res Response object
 */
export async function checkWalletInstalled(req: Request, res: Response) {
  try {
    const isInstalled = walletService.detectNautilusWallet();
    
    return res.status(200).json({ 
      installed: isInstalled
    });
  } catch (error) {
    console.error('Error checking wallet installation:', error);
    return res.status(500).json({ error: 'Failed to check wallet installation' });
  }
}

/**
 * Connect to Nautilus wallet
 * @param req Request object
 * @param res Response object
 */
export async function connectWallet(req: Request, res: Response) {
  try {
    const walletInfo = await walletService.connectNautilusWallet();
    
    return res.status(200).json(walletInfo);
  } catch (error) {
    console.error('Error connecting to wallet:', error);
    return res.status(500).json({ error: 'Failed to connect to wallet' });
  }
}

/**
 * Get wallet tokens
 * @param req Request object
 * @param res Response object
 */
export async function getWalletTokens(req: Request, res: Response) {
  try {
    const tokens = await walletService.scanWalletForTokens();
    
    return res.status(200).json(tokens);
  } catch (error) {
    console.error('Error getting wallet tokens:', error);
    return res.status(500).json({ error: 'Failed to get wallet tokens' });
  }
}

/**
 * Get wallet NFT collections
 * @param req Request object
 * @param res Response object
 */
export async function getWalletCollections(req: Request, res: Response) {
  try {
    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    const collections = await scanWalletForCollections(address);
    
    return res.status(200).json(collections);
  } catch (error) {
    console.error('Error getting wallet collections:', error);
    return res.status(500).json({ error: 'Failed to get wallet collections' });
  }
}

/**
 * Sign a transaction
 * @param req Request object containing unsigned transaction
 * @param res Response object
 */
export async function signTransaction(req: Request, res: Response) {
  try {
    const { unsignedTx } = req.body;
    
    if (!unsignedTx) {
      return res.status(400).json({ error: 'Unsigned transaction is required' });
    }
    
    const signedTx = await walletService.signTransaction(unsignedTx);
    
    return res.status(200).json({ signedTx });
  } catch (error) {
    console.error('Error signing transaction:', error);
    return res.status(500).json({ error: 'Failed to sign transaction' });
  }
}

/**
 * Submit a signed transaction
 * @param req Request object containing signed transaction
 * @param res Response object
 */
export async function submitTransaction(req: Request, res: Response) {
  try {
    const { signedTx } = req.body;
    
    if (!signedTx) {
      return res.status(400).json({ error: 'Signed transaction is required' });
    }
    
    const txId = await walletService.submitTransaction(signedTx);
    
    return res.status(200).json({ txId });
  } catch (error) {
    console.error('Error submitting transaction:', error);
    return res.status(500).json({ error: 'Failed to submit transaction' });
  }
} 