import { Request, Response } from 'express';
import { airdropService, AirdropConfig } from '../../services/airdrop/airdrop-service';

/**
 * Validate an airdrop configuration
 * @param req Request with airdrop configuration
 * @param res Response
 */
export async function validateAirdropConfig(req: Request, res: Response) {
  try {
    const config = req.body as AirdropConfig;
    
    // Validate the configuration
    const validation = airdropService.validateAirdropConfig(config);
    
    if (validation.valid) {
      return res.status(200).json({ valid: true });
    } else {
      return res.status(400).json({ 
        valid: false, 
        errors: validation.errors 
      });
    }
  } catch (error) {
    console.error('Error validating airdrop configuration:', error);
    return res.status(500).json({ 
      error: 'Failed to validate airdrop configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Calculate the fee for an airdrop
 * @param req Request with airdrop configuration
 * @param res Response
 */
export async function calculateAirdropFee(req: Request, res: Response) {
  try {
    const config = req.body as AirdropConfig;
    
    // Calculate the fee
    const fee = airdropService.calculateAirdropFee(config);
    
    return res.status(200).json({ 
      fee: fee.toString(),
      // Convert to ERG for display purposes (1 ERG = 1,000,000,000 nanoERG)
      feeInErg: Number(fee) / 1000000000
    });
  } catch (error) {
    console.error('Error calculating airdrop fee:', error);
    return res.status(500).json({ 
      error: 'Failed to calculate airdrop fee',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Execute an airdrop
 * @param req Request with airdrop configuration and sender address
 * @param res Response
 */
export async function executeAirdrop(req: Request, res: Response) {
  try {
    const { config, senderAddress } = req.body;
    
    if (!config) {
      return res.status(400).json({ error: 'Missing airdrop configuration' });
    }
    
    if (!senderAddress) {
      return res.status(400).json({ error: 'Missing sender address' });
    }
    
    // Validate the configuration
    const validation = airdropService.validateAirdropConfig(config);
    if (!validation.valid) {
      return res.status(400).json({ 
        valid: false, 
        errors: validation.errors 
      });
    }
    
    // Execute the airdrop
    const txId = await airdropService.executeAirdrop(config, senderAddress);
    
    return res.status(200).json({ 
      success: true,
      txId
    });
  } catch (error) {
    console.error('Error executing airdrop:', error);
    return res.status(500).json({ 
      error: 'Failed to execute airdrop',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 