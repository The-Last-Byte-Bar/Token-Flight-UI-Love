import { Router } from 'express';
import collectionRoutes from './collection.routes';
import walletRoutes from './wallet.routes';
import miningPoolRoutes from './mining-pool.routes';
import airdropRoutes from './airdrop.routes';

const router = Router();

// Register routes
router.use('/collections', collectionRoutes);
router.use('/wallet', walletRoutes);
router.use('/mining-pool', miningPoolRoutes);
router.use('/airdrop', airdropRoutes);

export default router; 