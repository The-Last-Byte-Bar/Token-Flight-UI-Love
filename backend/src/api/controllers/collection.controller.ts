import { Request, Response } from 'express';
import { scanWalletForCollections } from '../../services/collection/collection-discovery';

/**
 * Get NFT collections for a wallet address
 * @param req Request object containing wallet address
 * @param res Response object
 */
export async function getCollectionsForAddress(req: Request, res: Response) {
  try {
    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    const result = await scanWalletForCollections(address);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in getCollectionsForAddress:', error);
    return res.status(500).json({ error: 'Failed to get collections for address' });
  }
}

/**
 * Validate collection for distribution
 * @param req Request object containing collection data
 * @param res Response object
 */
export async function validateCollectionForDistribution(req: Request, res: Response) {
  try {
    const { collectionId, distributionMethod } = req.body;
    
    if (!collectionId) {
      return res.status(400).json({ error: 'Collection ID is required' });
    }
    
    if (!distributionMethod) {
      return res.status(400).json({ error: 'Distribution method is required' });
    }
    
    // In a real implementation, we would perform more validation here
    
    return res.status(200).json({ 
      valid: true, 
      collectionId,
      distributionMethod
    });
  } catch (error) {
    console.error('Error in validateCollectionForDistribution:', error);
    return res.status(500).json({ error: 'Failed to validate collection for distribution' });
  }
} 