import { Router, Request, Response } from 'express';
import * as miningPoolController from '../controllers/mining-pool.controller';
import axios from 'axios';

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

// Proxy for sigmanauts mining pool - for handling CORS issues
router.get('/sigmanauts-proxy', async (req: Request, res: Response) => {
  try {
    console.log('Sigmanauts proxy request received', {
      query: req.query,
      headers: req.headers
    });
    
    // Add address as query parameter if provided
    let url = 'http://5.78.102.130:8000/sigscore/miners/bonus';
    if (req.query.address) {
      url += `?address=${req.query.address}`;
    }
    
    console.log(`Proxying request to: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Sigmanauts API responded with:', {
      status: response.status,
      dataCount: Array.isArray(response.data) ? response.data.length : 'not an array',
      firstItem: Array.isArray(response.data) && response.data.length > 0 ? response.data[0] : null
    });
    
    if (response.status === 200) {
      res.status(200).json(response.data);
    } else {
      res.status(response.status).json({ error: 'Failed to fetch data from sigmanauts API' });
    }
  } catch (error) {
    console.error('Error proxying sigmanauts API:', error);
    res.status(500).json({ 
      error: 'Failed to proxy request to sigmanauts API',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 