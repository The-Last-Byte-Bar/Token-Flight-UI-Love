import { Router, Request, Response } from 'express';
import * as collectionController from '../controllers/collection.controller';

const router = Router();

/**
 * @route GET /api/collections/:address
 * @description Get NFT collections for a wallet address
 * @access Public
 */
router.get('/:address', async (req: Request, res: Response) => {
  await collectionController.getCollectionsForAddress(req, res);
});

/**
 * @route POST /api/collections/validate
 * @description Validate collection for distribution
 * @access Public
 */
router.post('/validate', async (req: Request, res: Response) => {
  await collectionController.validateCollectionForDistribution(req, res);
});

export default router; 