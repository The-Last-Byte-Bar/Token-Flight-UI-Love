import { Router } from 'express';
import collectionRoutes from './collection.routes';
import walletRoutes from './wallet.routes';
import miningPoolRoutes from './mining-pool.routes';
import airdropRoutes from './airdrop.routes';
import { Request, Response } from 'express';
import axios from 'axios';

const router = Router();

// Register routes
router.use('/collections', collectionRoutes);
router.use('/wallet', walletRoutes);
router.use('/mining-pool', miningPoolRoutes);
router.use('/airdrop', airdropRoutes);

// Direct proxy endpoint for sigmanauts API - handles CORS issues
router.get('/sigmanauts-proxy', async (req: Request, res: Response) => {
  try {
    console.log('Direct sigmanauts proxy request received', {
      query: req.query,
      headers: req.headers['user-agent']
    });
    
    const url = 'http://5.78.102.130:8000/sigscore/miners/bonus';
    console.log(`Proxying request directly to: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TokenFlightUI/1.0'
      },
    });
    
    console.log('Sigmanauts API direct proxy response:', {
      status: response.status,
      dataCount: Array.isArray(response.data) ? response.data.length : 'not an array',
      data: response.data
    });
    
    return res.status(200).json(response.data);
  } catch (error) {
    console.error('Error in direct sigmanauts proxy:', error);
    return res.status(500).json({ 
      error: 'Failed to proxy request to sigmanauts API',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 