import { 
  Box,
  OutputBuilder, 
  SByte, 
  SColl, 
  SConstant, 
  SInt,
  TransactionBuilder
} from '@fleet-sdk/core';
import { WalletInfo } from '@/types/index';
import { toast } from 'sonner';
import { ERG_DECIMALS } from './constants';
import { isConnectedToNautilus, isNautilusAvailable } from './wallet';
import { isValidErgoAddress, isValidAmount } from './validation';

// Fee amount in nanoERGs
export const DEFAULT_TX_FEE = "1000000"; // 0.001 ERG 
export const MIN_TX_FEE = "1000000"; // 0.001 ERG minimum
export const FEE_PER_KB = "1000000"; // Additional 0.001 ERG per KB

/**
 * Get all UTXOs (boxes) from the connected wallet
 */
export const getWalletBoxes = async (): Promise<Box<string>[]> => {
  if (!isNautilusAvailable() || !(await isConnectedToNautilus())) {
    throw new Error('Wallet not connected');
  }

  try {
    // Get all UTXOs from the wallet and convert them to Fleet SDK Box format
    const utxos = await window.ergo?.get_utxos() || [];
    console.log('Wallet UTXOs received:', utxos.length, utxos[0]);
    
    // Ensure all UTXOs have the necessary fields for Fleet SDK
    return utxos.map(box => convertErgoBoxToFleetBox(box));
  } catch (error) {
    console.error('Error getting wallet UTXOs:', error);
    throw error;
  }
};

/**
 * Convert an Ergo box from Nautilus format to Fleet SDK Box format
 */
const convertErgoBoxToFleetBox = (box: any): Box<string> => {
  // Log the box properties for debugging
  console.log('Converting box with properties:', {
    boxId: box.boxId,
    txId: box.txId,
    tx_id: box.tx_id,
    transactionId: box.transactionId,
    index: box.index,
    valueERG: Number(box.value) / 1000000000,
  });
  
  // Ensure the box has all required fields
  if (!box.boxId) {
    console.error('Box missing boxId:', box);
    throw new Error('Box missing boxId');
  }

  // Check for transaction ID in different possible fields
  const transactionId = box.txId || box.tx_id || box.transactionId;
  if (!transactionId) {
    console.error('Box missing transactionId:', box);
    throw new Error('TransactionId must be provided (txId, tx_id, or transactionId)');
  }

  if (box.index === undefined) {
    console.error('Box missing index:', box);
    throw new Error('Box missing index');
  }

  // Convert the box to Fleet SDK format
  const fleetBox: Box<string> = {
    boxId: box.boxId,
    transactionId: transactionId,
    index: box.index,
    ergoTree: box.ergoTree,
    creationHeight: box.creationHeight,
    value: box.value.toString(),
    assets: box.assets?.map((asset: any) => ({
      tokenId: asset.tokenId,
      amount: asset.amount.toString()
    })) || [],
    additionalRegisters: box.additionalRegisters || {}
  };

  console.log('Successfully converted box:', {
    boxId: fleetBox.boxId,
    txId: fleetBox.transactionId,
    index: fleetBox.index,
    valueERG: Number(fleetBox.value) / 1000000000,
    assets: fleetBox.assets.length
  });

  return fleetBox;
};

/**
 * Build a transaction to send tokens to multiple recipients
 * @param wallet Wallet information
 * @param recipients List of recipients and amounts to send
 * @param tokenId Token ID to send (undefined for ERG)
 * @param fee Transaction fee in nanoERGs
 */
export const buildTokenTransferTx = async (
  wallet: WalletInfo,
  recipients: { address: string; amount: string | number | bigint }[],
  tokenId?: string,
  fee: string = DEFAULT_TX_FEE
) => {
  if (!isNautilusAvailable() || !(await isConnectedToNautilus())) {
    throw new Error('Wallet not connected');
  }
  
  // Validate recipients before proceeding
  if (!recipients || recipients.length === 0) {
    throw new Error('No recipients provided for transaction');
  }
  
  // Validate and log all recipients upfront with more detailed information
  console.log('Processing transaction with recipients:', recipients.map(r => ({
    address: r.address?.substring(0, 10) + '...',
    amount: r.amount,
    amountType: typeof r.amount
  })));
  
  // Validate all recipients upfront to catch errors early
  for (const recipient of recipients) {
    if (!recipient.address || !isValidErgoAddress(recipient.address)) {
      throw new Error(`Invalid Ergo address: ${recipient.address || 'undefined'}`);
    }
    
    // More explicit amount validation
    if (!isValidAmount(recipient.amount)) {
      throw new Error(`Invalid amount for recipient ${recipient.address.substring(0, 10)}...: ${recipient.amount}`);
    }
  }

  try {
    // Get input boxes from wallet
    const inputBoxes = await getWalletBoxes();
    
    if (inputBoxes.length === 0) {
      throw new Error('No input boxes available in wallet');
    }

    // Get the current blockchain height for better transaction compatibility
    let blockHeight = 1000000;
    try {
      // Note: get_current_height is available in newer Nautilus versions
      // Fallback to default if not available
      // Using any type to bypass TypeScript checking for this optional method
      const ergoWallet = window.ergo as any;
      if (ergoWallet?.get_current_height) {
        const currentHeight = await ergoWallet.get_current_height();
        if (currentHeight) {
          blockHeight = currentHeight;
          console.log(`Using current blockchain height: ${blockHeight}`);
        }
      }
    } catch (heightError) {
      console.warn(`Could not get current height, using default: ${blockHeight}`, heightError);
    }

    // Initialize transaction builder with the current block height
    const txBuilder = new TransactionBuilder(blockHeight);
    
    // Add input boxes
    txBuilder.from(inputBoxes);

    // Limit the number of recipients per transaction to enhance compatibility
    const MAX_RECIPIENTS_PER_TX = 20;
    if (recipients.length > MAX_RECIPIENTS_PER_TX) {
      console.warn(`Large number of recipients (${recipients.length}), consider splitting into multiple transactions`);
    }

    // Add outputs for each recipient
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      console.log(`Processing recipient ${i+1}/${recipients.length}:`, {
        addressPrefix: recipient.address?.substring(0, 10),
        amount: recipient.amount,
        amountType: typeof recipient.amount
      });
      
      try {
        // NEW ENHANCED ERROR HANDLING AND DEBUG LOGS
        
        // 1. Validate recipient address
        if (!recipient.address || !isValidErgoAddress(recipient.address)) {
          throw new Error(`Invalid address for recipient ${i+1}: ${recipient.address}`);
        }
        console.log(`Valid address confirmed for recipient ${i+1}: ${recipient.address.substring(0, 15)}...`);
        
        // 2. Convert and validate the amount (completely separate from address)
        let amountStr: string;
        let recipientAddress = recipient.address; // Save address in a separate variable
        
        // Special handling for amount formatting based on type
        if (typeof recipient.amount === 'string') {
          // Make sure it's actually a numeric string that can be converted to BigInt
          if (!/^\d+$/.test(recipient.amount)) {
            console.error(`Invalid amount string: "${recipient.amount}". Not a valid integer string.`);
            throw new Error(`Amount "${recipient.amount}" is not a valid integer string.`);
          }
          amountStr = recipient.amount;
        } 
        else if (typeof recipient.amount === 'number') {
          if (isNaN(recipient.amount) || recipient.amount <= 0) {
            throw new Error(`Invalid amount number: ${recipient.amount}`);
          }
          // Floor the number to ensure it's an integer
          amountStr = Math.floor(recipient.amount).toString();
        } 
        else if (typeof recipient.amount === 'bigint') {
          amountStr = recipient.amount.toString();
        }
        else {
          throw new Error(`Unsupported amount type: ${typeof recipient.amount}`);
        }
        
        console.log(`Amount for recipient ${i+1} parsed as: ${amountStr}`);
        
        // 3. Create BigInt amount - this is where the error happened before
        let amountBigInt: bigint;
        try {
          amountBigInt = BigInt(amountStr);
          console.log(`Successfully converted amount to BigInt: ${amountBigInt.toString()}`);
        } catch (error) {
          console.error(`Failed to convert amount "${amountStr}" to BigInt:`, error);
          throw new Error(`Failed to convert amount "${amountStr}" to BigInt: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        // 4. Create output builder with ERG value (min amount for token transfer)
        // Increase minimum ERG value to 0.002 ERG (2000000 nanoERG) to ensure it passes blockchain validation
        // The Ergo blockchain requires at least 0.001 ERG per box, plus more for tokens
        const MIN_TOKEN_BOX_VALUE = "2000000"; // 0.002 ERG for token transfers
        const ergValue = tokenId ? MIN_TOKEN_BOX_VALUE : amountBigInt.toString();
        
        console.log(`Creating output for recipient ${i+1}:`, {
          recipientAddress,
          ergValue,
          hasToken: !!tokenId,
          tokenId: tokenId || 'None (ERG transfer)'
        });
        
        // 5. Create output builder in a try-catch to capture any specific errors
        let outputBuilder;
        try {
          outputBuilder = new OutputBuilder(ergValue, recipientAddress);
          console.log(`OutputBuilder created successfully`);
        } catch (error) {
          console.error(`Error creating OutputBuilder:`, error);
          console.error(`Parameters used:`, { value: ergValue, address: recipientAddress });
          throw error;
        }
        
        // 6. Add token to output if we're doing a token transfer
        if (tokenId) {
          try {
            outputBuilder.addTokens([{
              tokenId,
              amount: amountBigInt.toString()
            }]);
            console.log(`Token ${tokenId.substring(0, 10)}... added to output successfully`);
          } catch (error) {
            console.error(`Error adding token to output:`, error);
            console.error(`Token parameters:`, { tokenId, amount: amountBigInt.toString() });
            throw error;
          }
        }
        
        // 7. Add this output to the transaction
        try {
          txBuilder.to(outputBuilder);
          console.log(`Output for recipient ${i+1} added to transaction successfully`);
        } catch (error) {
          console.error(`Error adding output to transaction:`, error);
          throw error;
        }
      } catch (error) {
        const errorMessage = `Error processing recipient ${i+1} (${recipient.address?.substring(0, 10) + '...' || 'unknown'}): ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMessage);
        console.error(`Recipient details:`, {
          address: recipient.address,
          amount: recipient.amount,
          amountType: typeof recipient.amount
        });
        throw new Error(errorMessage);
      }
    }

    // Set change address
    if (!wallet.changeAddress && !wallet.address) {
      throw new Error('No change address available');
    }
    txBuilder.sendChangeTo(wallet.changeAddress || wallet.address || '');

    // Set transaction fee
    txBuilder.payFee(fee);

    // Build the unsigned transaction
    const unsignedTx = txBuilder.build().toEIP12Object();

    // Verify the transaction fee is adequate
    const actualFee = fee || DEFAULT_TX_FEE;
    const recommendedFee = calculateRecommendedFee(unsignedTx);
    
    if (BigInt(actualFee) < BigInt(recommendedFee)) {
      console.warn(`Transaction fee (${actualFee}) may be too low. Recommended: ${recommendedFee}`);
      toast.warning(`Transaction fee may be too low. Consider using at least ${BigInt(recommendedFee) / BigInt(10**9)} ERG for better chance of success.`);
    }
    
    return unsignedTx;
  } catch (error) {
    console.error('Error building transaction:', error);
    toast.error(`Transaction building error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
};

/**
 * Sign and submit a transaction using the connected wallet
 */
export const signAndSubmitTx = async (unsignedTx: any): Promise<string> => {
  if (!isNautilusAvailable() || !(await isConnectedToNautilus())) {
    throw new Error('Wallet not connected');
  }
  
  try {
    console.log('Attempting to sign transaction:', {
      inputsCount: unsignedTx.inputs?.length || 0,
      outputsCount: unsignedTx.outputs?.length || 0,
      dataInputsCount: unsignedTx.dataInputs?.length || 0,
    });
    
    // Sign the transaction using the wallet
    let signedTx;
    try {
      signedTx = await window.ergo?.sign_tx(unsignedTx);
      console.log('Transaction signed successfully:', !!signedTx);
    } catch (signError) {
      console.error('Detailed sign error:', signError);
      
      // Special handling for code 1 errors (common with Nautilus)
      if (signError && typeof signError === 'object' && 'code' in signError && signError.code === 1) {
        // Common causes for code 1 errors:
        // 1. Insufficient funds
        // 2. Transaction too complex
        // 3. User rejected
        // 4. Wallet locked
        
        const suggestions = [
          "Ensure you have sufficient ERG for transaction fees",
          "Try with fewer recipients in a single transaction",
          "Check if your wallet is unlocked",
          "Make sure you have enough of the token you're trying to send",
          "Verify you're connected to the correct Ergo network"
        ];
        
        console.error("Code 1 error - Common solutions:", suggestions);
        throw new Error(`Wallet transaction signing failed. Possible solutions: ${suggestions.join(", ")}`);
      }
      
      throw new Error(`Failed to sign transaction: ${JSON.stringify(signError)}`);
    }
    
    if (!signedTx) {
      throw new Error('Wallet returned empty signed transaction - user may have denied the request');
    }
    
    console.log('Signed transaction structure:', {
      inputsCount: signedTx.inputs?.length || 0,
      outputsCount: signedTx.outputs?.length || 0,
    });
    
    // Submit the signed transaction
    let txId;
    try {
      // Log detailed information about the signed transaction
      console.log('Submitting transaction with structure:', {
        inputs: signedTx.inputs?.map(input => ({
          boxId: input.boxId,
          extension: !!input.extension,
          spendingProof: !!input.spendingProof
        })),
        outputs: signedTx.outputs?.map((output, i) => ({
          index: i,
          value: output.value,
          ergoTree: output.ergoTree?.substring(0, 20) + '...',
          assets: output.assets?.length || 0
        })),
        size: JSON.stringify(signedTx).length
      });

      // Add a small delay before submitting (can help with wallet readiness)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      txId = await window.ergo?.submit_tx(signedTx);
      console.log('Transaction submitted with ID:', txId);
    } catch (submitError) {
      console.error('Detailed submit error:', submitError);
      
      // Enhanced error logging for more specific diagnosis
      console.error('Submit error type:', typeof submitError);
      if (submitError && typeof submitError === 'object') {
        console.error('Submit error properties:', Object.keys(submitError));
        
        // Try to extract more information from common error patterns
        if ('message' in submitError) console.error('Error message:', (submitError as any).message);
        if ('cause' in submitError) console.error('Error cause:', (submitError as any).cause);
        if ('response' in submitError) console.error('Error response:', (submitError as any).response);
      }
      
      // Special handling for code 1 errors (common with Nautilus)
      if (submitError && typeof submitError === 'object' && 'code' in submitError && submitError.code === 1) {
        // Common causes for code 1 errors in submission:
        // 1. Network connectivity issues
        // 2. Node rejected transaction (double spend, invalid, etc.)
        // 3. Wallet not properly connected to node
        
        const suggestions = [
          "Check your internet connection",
          "Ensure your wallet is properly connected to an Ergo node",
          "The transaction may violate blockchain rules (e.g., minimum ERG per box)",
          "Try with a higher fee if the network is congested",
          "Wait a few minutes and try again"
        ];
        
        console.error("Code 1 submit error - Common solutions:", suggestions);
        throw new Error(`Transaction submission failed. Possible solutions: ${suggestions.join(", ")}`);
      }
      
      throw new Error(`Failed to submit transaction: ${JSON.stringify(submitError)}`);
    }
    
    if (!txId) {
      throw new Error('Wallet returned empty transaction ID after submission');
    }
    
    return txId;
  } catch (error) {
    // Enhanced error logging
    console.error('Error in signAndSubmitTx:', error);
    if (typeof error === 'object' && error !== null) {
      console.error('Error details:', JSON.stringify(error, null, 2));
    }
    
    // Create a more descriptive error message
    let errorMessage = 'Transaction signing/submission failed';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error);
    }
    
    toast.error(`Transaction error: ${errorMessage}`);
    throw error; // Re-throw the original error to maintain the stack trace
  }
};

/**
 * Create and mint an NFT
 */
export const createNFT = async (
  wallet: WalletInfo,
  name: string, 
  description: string, 
  imageUrl: string, 
  quantity: number = 1,
  royaltyAddress?: string,
  royaltyPercentage: number = 0
) => {
  if (!isNautilusAvailable() || !(await isConnectedToNautilus())) {
    throw new Error('Wallet not connected');
  }
  
  try {
    // Get input boxes from wallet
    const inputBoxes = await getWalletBoxes();
    
    // Create NFT metadata as registers
    const r4 = SConstant(SColl(SByte, Buffer.from(name, 'utf-8')));
    const r5 = SConstant(SColl(SByte, Buffer.from(description, 'utf-8')));
    const r6 = SConstant(SColl(SByte, Buffer.from(imageUrl, 'utf-8')));
    
    // Add some registers with royalty information if applicable
    const r7 = royaltyPercentage > 0 && royaltyAddress
      ? SConstant(SColl(SByte, Buffer.from(royaltyAddress, 'utf-8')))
      : undefined;
    const r8 = royaltyPercentage > 0
      ? SConstant(SInt(royaltyPercentage * 100)) // Store as integer percentage * 100
      : undefined;
    
    // Initialize transaction builder (default block height)
    const txBuilder = new TransactionBuilder(1000000);
    
    // Add inputs
    txBuilder.from(inputBoxes);
    
    // Create minting box with token emission
    const mintBox = new OutputBuilder(
      "1000000", // Minimum value required for token (1 milliERG)
      wallet.address || ''
    )
    .mintToken({
      amount: BigInt(quantity),
      name,
      description,
      decimals: 0
    })
    .setAdditionalRegisters({
      R4: r4,
      R5: r5,
      R6: r6,
      ...(r7 ? { R7: r7 } : {}),
      ...(r8 ? { R8: r8 } : {})
    });
    
    // Add the minting box to the transaction
    txBuilder.to(mintBox);
    
    // Set change address
    txBuilder.sendChangeTo(wallet.changeAddress || wallet.address || '');
    
    // Set transaction fee
    txBuilder.payFee(DEFAULT_TX_FEE);
    
    // Build the unsigned transaction
    const unsignedTx = txBuilder.build().toEIP12Object();
    
    // Verify the transaction fee is adequate
    const actualFee = DEFAULT_TX_FEE;
    const recommendedFee = calculateRecommendedFee(unsignedTx);
    
    if (BigInt(actualFee) < BigInt(recommendedFee)) {
      console.warn(`Transaction fee (${actualFee}) may be too low. Recommended: ${recommendedFee}`);
      toast.warning(`Transaction fee may be too low. Consider using at least ${BigInt(recommendedFee) / BigInt(10**9)} ERG for better chance of success.`);
    }
    
    // Sign and submit the transaction
    return await signAndSubmitTx(unsignedTx);
  } catch (error) {
    console.error('Error creating NFT:', error);
    toast.error(`NFT creation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
};

/**
 * Calculate total wallet balance including all assets
 */
export const calculateWalletBalance = async () => {
  try {
    // Get all UTXOs from the wallet
    const boxes = await getWalletBoxes();
    
    // Calculate total ERG balance and tokens
    let totalNanoErgs = 0n;
    const tokens = new Map<string, bigint>();
    
    boxes.forEach(box => {
      // Add ERG value
      totalNanoErgs += BigInt(box.value);
      
      // Add tokens
      box.assets.forEach(asset => {
        const { tokenId, amount } = asset;
        const currentAmount = tokens.get(tokenId) || 0n;
        tokens.set(tokenId, currentAmount + BigInt(amount));
      });
    });
    
    return {
      nanoErgs: totalNanoErgs,
      ergs: Number(totalNanoErgs) / Math.pow(10, ERG_DECIMALS),
      tokens: Array.from(tokens.entries()).map(([tokenId, amount]) => ({
        tokenId,
        amount
      }))
    };
  } catch (error) {
    console.error('Error calculating wallet balance:', error);
    throw error;
  }
};

/**
 * Calculate recommended fee based on transaction size and complexity
 * @param txObj Transaction object
 * @returns Recommended fee in nanoERGs as string
 */
export const calculateRecommendedFee = (txObj: any): string => {
  // Default base fee for transactions
  const BASE_FEE = 1000000n; // 0.001 ERG
  
  // Additional fee per KB of transaction size (approximate)
  const FEE_PER_KB = 500000n; // 0.0005 ERG per KB
  
  // Complexity-based additions
  const inputCount = txObj.inputs?.length || 0;
  const outputCount = txObj.outputs?.length || 0;
  const dataInputCount = txObj.dataInputs?.length || 0;
  
  // Estimate size in KB (very rough approximation)
  // A typical input is ~100 bytes and output ~60 bytes
  const estimatedSizeBytes = (inputCount * 100) + (outputCount * 60) + (dataInputCount * 32);
  const estimatedSizeKB = Math.max(1, Math.ceil(estimatedSizeBytes / 1024));
  
  // Calculate fee based on complexity
  const perKBFee = FEE_PER_KB * BigInt(estimatedSizeKB);
  
  // Higher fee for more complex transactions
  const complexityFactor = BigInt(Math.max(1, Math.min(3, Math.ceil((inputCount + outputCount) / 10))));
  
  // Final fee calculation
  const recommendedFee = BASE_FEE + perKBFee * complexityFactor;
  
  // For very small transactions, still ensure minimum fee
  const finalFee = recommendedFee < 1000000n ? 1000000n : recommendedFee;
  
  console.log("Calculated fee for transaction:", finalFee.toString(), "nanoERG", {
    estimatedSizeKB, 
    inputCount, 
    outputCount, 
    dataInputCount
  });
  
  return finalFee.toString();
}; 