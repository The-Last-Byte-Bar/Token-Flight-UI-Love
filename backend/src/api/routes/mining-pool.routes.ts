import { Router, Request, Response } from 'express';
import * as miningPoolController from '../controllers/mining-pool.controller';

const router = Router();

// Get miners data
router.get('/miners', async (req: Request, res: Response) => {
  await miningPoolController.getMiners(req, res);
});

// Get miner addresses for airdrop
router.get('/addresses', async (req: Request, res: Response) => {
  await miningPoolController.getMinerAddresses(req, res);
});

// Get pool stats
router.get('/stats', async (req: Request, res: Response) => {
  await miningPoolController.getPoolStats(req, res);
});

export default router; 