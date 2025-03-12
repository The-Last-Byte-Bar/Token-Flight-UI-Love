import { Router, Request, Response } from 'express';
import * as walletController from '../controllers/wallet.controller';

const router = Router();

// Check if wallet is installed
router.get('/installed', async (req: Request, res: Response) => {
  await walletController.checkWalletInstalled(req, res);
});

// Connect to wallet
router.get('/connect', async (req: Request, res: Response) => {
  await walletController.connectWallet(req, res);
});

// Get wallet tokens
router.get('/tokens', async (req: Request, res: Response) => {
  await walletController.getWalletTokens(req, res);
});

// Get wallet NFT collections
router.get('/collections/:address', async (req: Request, res: Response) => {
  await walletController.getWalletCollections(req, res);
});

// Sign a transaction
router.post('/sign', async (req: Request, res: Response) => {
  await walletController.signTransaction(req, res);
});

// Submit a signed transaction
router.post('/submit', async (req: Request, res: Response) => {
  await walletController.submitTransaction(req, res);
});

export default router; 