import { Request, Response } from 'express';
import { airdropService, AirdropConfig } from '../../services/airdrop/airdrop-service';
import { transactionHistoryService } from '../../services/airdrop/transaction-history.service';
import { previewGeneratorService } from '../../services/airdrop/preview-generator.service';

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
    const result = await airdropService.executeAirdrop(config, senderAddress);
    
    return res.status(200).json({ 
      success: true,
      txId: result.txId,
      recordId: result.recordId
    });
  } catch (error) {
    console.error('Error executing airdrop:', error);
    return res.status(500).json({ 
      error: 'Failed to execute airdrop',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get transaction history for an address
 * @param req Request with sender address
 * @param res Response
 */
export async function getTransactionHistory(req: Request, res: Response) {
  try {
    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json({ error: 'Missing wallet address' });
    }
    
    const transactions = transactionHistoryService.getTransactionsForAddress(address);
    
    return res.status(200).json(transactions);
  } catch (error) {
    console.error('Error getting transaction history:', error);
    return res.status(500).json({ 
      error: 'Failed to get transaction history',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get transaction progress
 * @param req Request with transaction record ID
 * @param res Response
 */
export async function getTransactionProgress(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing transaction ID' });
    }
    
    const transaction = transactionHistoryService.getTransaction(id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    const progress = transactionHistoryService.getTransactionProgress(id);
    if (!progress) {
      return res.status(404).json({ error: 'Transaction progress not found' });
    }
    
    return res.status(200).json({
      transaction,
      progress
    });
  } catch (error) {
    console.error('Error getting transaction progress:', error);
    return res.status(500).json({ 
      error: 'Failed to get transaction progress',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Generate a preview of an airdrop
 * @param req Request with airdrop configuration
 * @param res Response
 */
export async function generateAirdropPreview(req: Request, res: Response) {
  try {
    const config = req.body as AirdropConfig;
    
    // Validate the configuration first
    const validation = airdropService.validateAirdropConfig(config);
    if (!validation.valid) {
      return res.status(400).json({ 
        valid: false, 
        errors: validation.errors 
      });
    }
    
    // Get token metadata from request if provided
    const { tokenMetadata } = req.body;
    
    // Generate preview
    const preview = previewGeneratorService.generatePreview(config, tokenMetadata);
    
    return res.status(200).json(preview);
  } catch (error) {
    console.error('Error generating airdrop preview:', error);
    return res.status(500).json({ 
      error: 'Failed to generate airdrop preview',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 