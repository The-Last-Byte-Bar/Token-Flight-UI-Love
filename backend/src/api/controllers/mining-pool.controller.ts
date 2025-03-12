import { Request, Response } from 'express';
import miningPoolApi from '../../services/api/mining-pool-api';

/**
 * Get miners data from the pool
 * @param req Request object
 * @param res Response object
 */
export async function getMiners(req: Request, res: Response) {
  try {
    const miners = await miningPoolApi.getMiners();
    
    return res.status(200).json(miners);
  } catch (error) {
    console.error('Error getting miners data:', error);
    return res.status(500).json({ error: 'Failed to get miners data' });
  }
}

/**
 * Get miner addresses for airdrop
 * @param req Request object containing filter parameters
 * @param res Response object
 */
export async function getMinerAddresses(req: Request, res: Response) {
  try {
    const { minHashrate, activeOnly, excludeAddresses } = req.query;
    
    // Convert query parameters
    const options = {
      minHashrate: minHashrate ? Number(minHashrate) : undefined,
      activeOnly: activeOnly === 'true',
      excludeAddresses: excludeAddresses ? String(excludeAddresses).split(',') : undefined
    };
    
    const addresses = await miningPoolApi.getMinerAddresses(options);
    
    return res.status(200).json(addresses);
  } catch (error) {
    console.error('Error getting miner addresses:', error);
    return res.status(500).json({ error: 'Failed to get miner addresses' });
  }
}

/**
 * Get mining pool stats
 * @param req Request object
 * @param res Response object
 */
export async function getPoolStats(req: Request, res: Response) {
  try {
    const stats = await miningPoolApi.getPoolStats();
    
    return res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting pool stats:', error);
    return res.status(500).json({ error: 'Failed to get pool stats' });
  }
} 