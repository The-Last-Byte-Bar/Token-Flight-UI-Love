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

// Declare ergo type from window object
declare const ergo: {
  get_used_addresses: () => Promise<string[]>;
  get_change_address: () => Promise<string>;
  get_utxos: () => Promise<any[]>;
  get_current_height: () => Promise<number>;
  sign_tx: (unsignedTx: any) => Promise<any>;
  submit_tx: (signedTx: any) => Promise<string>;
};

// Fee amount in nanoERGs
export const DEFAULT_TX_FEE = "1000000"; // 0.001 ERG for mining fee
export const MIN_TX_FEE = "1000000"; // 0.001 ERG minimum
export const FEE_PER_BOX = "1000000"; // 0.001 ERG per box creation

/**
 * Get all UTXOs (boxes) from the connected wallet
 */
export const getWalletBoxes = async (): Promise<Box<string>[]> => {
  if (!isNautilusAvailable() || !(await isConnectedToNautilus())) {
    throw new Error('Wallet not connected');
  }

  try {
    // Get all UTXOs from the wallet and convert them to Fleet SDK Box format
    const utxos = await ergo.get_utxos();
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
    const signedTx = await ergo.sign_tx(unsignedTx);
    
    if (!signedTx) {
      throw new Error('Wallet returned empty signed transaction');
    }

    console.log('Transaction signed successfully:', {
      inputsCount: signedTx.inputs?.length || 0,
      outputsCount: signedTx.outputs?.length || 0,
    });

    // Submit the transaction
    const txId = await ergo.submit_tx(signedTx);
    
    if (!txId) {
      throw new Error('Wallet returned empty transaction ID');
    }

    console.log('Transaction submitted successfully:', txId);
    return txId;
    
  } catch (error) {
    console.error('Error in signAndSubmitTx:', error);
    
    // Enhanced error handling
    if (error instanceof Error) {
      if (error.message.includes('password') || error.message.includes('rejected')) {
        throw new Error('Wallet authentication failed. Please check your password and try again.');
      }
      throw error;
    }
    
    // If it's a code 1 error from Nautilus, try to get more information
    if (error && typeof error === 'object' && 'code' in error && error.code === 1) {
      console.error('Detailed error object:', error);
      
      // Try to extract more specific error information
      let errorInfo = 'Unknown error';
      if ('info' in error && error.info) {
        errorInfo = error.info as string;
      }
      
      const suggestions = [
        "Check your internet connection",
        "Ensure your wallet is properly connected to an Ergo node",
        "The transaction may violate blockchain rules (e.g., minimum ERG per box)",
        "Try with a higher fee if the network is congested",
        "Wait a few minutes and try again"
      ];
      
      throw new Error(`Transaction submission failed (${errorInfo}). Possible solutions: ${suggestions.join(", ")}`);
    }
    
    throw new Error(`Failed to submit transaction: ${JSON.stringify(error)}`);
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
  // Base fee for mining (0.001 ERG)
  const BASE_FEE = 1000000n;
  
  // Instead of adding fee per box, we'll just use the minimum required fee
  // This ensures we don't overcharge users for multi-output transactions
  const totalFee = BASE_FEE;
  
  console.log("Calculated fee for transaction:", {
    feeInERG: Number(totalFee) / 1e9,
    outputCount: txObj.outputs?.length || 0,
    baseFee: Number(BASE_FEE) / 1e9
  });
  
  return totalFee.toString();
};

/**
 * Build a transaction to send multiple tokens and NFTs to recipients
 * @param wallet Wallet information
 * @param distributions Array of distributions containing tokens and NFTs to send
 * @param fee Transaction fee in nanoERGs
 */
export const buildBatchTransferTx = async (
  wallet: WalletInfo,
  distributions: {
    address: string;
    tokens: { tokenId: string; amount: string | number | bigint; decimals?: number }[];
    nfts: { tokenId: string; amount?: string }[];
  }[],
  fee: string = DEFAULT_TX_FEE
) => {
  if (!isNautilusAvailable() || !(await isConnectedToNautilus())) {
    throw new Error('Wallet not connected');
  }
  
  // Validate distributions before proceeding
  if (!distributions || distributions.length === 0) {
    throw new Error('No distributions provided for transaction');
  }
  
  try {
    // Get input boxes from wallet
    const inputBoxes = await getWalletBoxes();
    
    if (inputBoxes.length === 0) {
      throw new Error('No input boxes available in wallet');
    }

    // Validate token balances before proceeding
    // Calculate total tokens needed for all distributions
    const requiredTokens: Map<string, bigint> = new Map();
    
    for (const distribution of distributions) {
      for (const token of distribution.tokens) {
        // Convert amount to bigint for consistent comparison
        // The amount should already be in raw units from airdropState.ts
        let tokenAmount: bigint;
        if (typeof token.amount === 'string') {
          tokenAmount = BigInt(token.amount);
        } else if (typeof token.amount === 'number') {
          // If a number, it should already account for decimals
          // Just convert to bigint
          tokenAmount = BigInt(Math.floor(token.amount));
        } else {
          tokenAmount = token.amount;
        }
        
        console.log(`Validating token ${token.tokenId.substring(0, 8)}...`, {
          inputAmount: token.amount,
          convertedAmount: tokenAmount.toString(),
          decimals: token.decimals
        });
        
        // Add to required tokens map
        const currentRequired = requiredTokens.get(token.tokenId) || 0n;
        requiredTokens.set(token.tokenId, currentRequired + tokenAmount);
      }
      
      // Add NFTs (1 per NFT)
      for (const nft of distribution.nfts) {
        const currentRequired = requiredTokens.get(nft.tokenId) || 0n;
        requiredTokens.set(nft.tokenId, currentRequired + 1n);
      }
    }
    
    // Calculate available tokens in wallet
    const availableTokens: Map<string, bigint> = new Map();
    for (const box of inputBoxes) {
      for (const asset of box.assets) {
        const currentAmount = availableTokens.get(asset.tokenId) || 0n;
        availableTokens.set(asset.tokenId, currentAmount + BigInt(asset.amount));
      }
    }
    
    // Log all token balances for debugging
    console.log('Available token balances:', Array.from(availableTokens.entries()).map(([id, amount]) => ({
      tokenId: id.substring(0, 8) + '...',
      available: amount.toString()
    })));
    
    console.log('Required token amounts:', Array.from(requiredTokens.entries()).map(([id, amount]) => ({
      tokenId: id.substring(0, 8) + '...',
      required: amount.toString()
    })));
    
    // Check if we have enough of each token
    for (const [tokenId, requiredAmount] of requiredTokens.entries()) {
      const availableAmount = availableTokens.get(tokenId) || 0n;
      if (availableAmount < requiredAmount) {
        console.error(`Insufficient token balance for ${tokenId.substring(0, 10)}...`, {
          required: requiredAmount.toString(),
          available: availableAmount.toString()
        });
        throw new Error(`Insufficient token balance: Required ${requiredAmount} of token ${tokenId.substring(0, 6)}..., but only ${availableAmount} available`);
      }
    }

    // Get the current blockchain height
    let blockHeight = 1000000;
    try {
      const currentHeight = await ergo.get_current_height();
      if (currentHeight) {
        blockHeight = currentHeight;
        console.log(`Using current blockchain height: ${blockHeight}`);
      }
    } catch (heightError) {
      console.warn(`Could not get current height, using default: ${blockHeight}`, heightError);
    }

    // Initialize transaction builder
    const txBuilder = new TransactionBuilder(blockHeight);
    
    // Add input boxes
    txBuilder.from(inputBoxes);

    // Process each distribution
    for (const distribution of distributions) {
      const { address, tokens, nfts } = distribution;
      
      // Validate address
      if (!address || !isValidErgoAddress(address)) {
        throw new Error(`Invalid Ergo address: ${address || 'undefined'}`);
      }

      // Calculate minimum ERG value needed for this output
      // Modified to use fixed minimum value per box with a small increment per token
      const tokenCount = tokens.length + nfts.length;
      const MIN_BOX_VALUE = BigInt(1000000); // 0.001 ERG minimum box value (unchanged)
      const TOKEN_SIZE_VALUE = BigInt(100000); // 0.0001 ERG per token for box size (reduced)
      
      // Use a fixed minimum amount per recipient instead of per token
      const boxValue = MIN_BOX_VALUE + (BigInt(tokenCount) * TOKEN_SIZE_VALUE);

      console.log(`Creating output box for ${address} with:`, {
        tokenCount,
        baseValue: Number(MIN_BOX_VALUE) / 1e9,
        tokenSizeValue: Number(TOKEN_SIZE_VALUE * BigInt(tokenCount)) / 1e9,
        totalValue: Number(boxValue) / 1e9
      });

      // Create output builder with calculated ERG value
      const outputBuilder = new OutputBuilder(boxValue.toString(), address);

      // Add tokens
      for (const token of tokens) {
        if (!isValidAmount(token.amount)) {
          throw new Error(`Invalid amount for token ${token.tokenId}: ${token.amount}`);
        }

        // The amount should already be in raw units from airdropState.ts,
        // so we don't need to apply decimal conversion again
        let amountStr: string;
        if (typeof token.amount === 'string') {
          amountStr = token.amount;
        } else if (typeof token.amount === 'number') {
          amountStr = Math.floor(token.amount).toString();
        } else {
          amountStr = token.amount.toString();
        }

        // Validate the final amount string
        if (!/^\d+$/.test(amountStr)) {
          throw new Error(`Invalid amount string after conversion: ${amountStr}`);
        }

        // Validate amount against available balance
        const amountValue = BigInt(amountStr);
        const availableForToken = availableTokens.get(token.tokenId) || 0n;
        
        if (amountValue > availableForToken) {
          console.error(`Insufficient token balance for ${token.tokenId.substring(0, 10)}...`, {
            required: amountValue.toString(),
            available: availableForToken.toString()
          });
          throw new Error(`Insufficient token balance: Required ${amountValue} of token ${token.tokenId.substring(0, 6)}..., but only ${availableForToken} available`);
        }

        console.log(`Adding token ${token.tokenId.substring(0, 8)}... to output:`, {
          rawAmount: amountStr,
          originalAmount: token.amount,
          correctDecimals: token.decimals || 0
        });

        outputBuilder.addTokens([{
          tokenId: token.tokenId,
          amount: amountStr
        }]);
      }

      // Add NFTs with their specific amounts
      for (const nft of nfts) {
        const nftAmount = nft.amount || "1";  // Make sure we use the specific amount for this NFT
        
        console.log(`Adding NFT ${nft.tokenId.substring(0, 8)}... to transaction:`, {
          amount: nftAmount,
          recipientAddress: address.substring(0, 10) + '...'
        });
        
        outputBuilder.addTokens([{
          tokenId: nft.tokenId,
          amount: nftAmount
        }]);
      }

      // Add output to transaction
      txBuilder.to(outputBuilder);
    }

    // Set change address
    if (!wallet.changeAddress && !wallet.address) {
      throw new Error('No change address available');
    }
    txBuilder.sendChangeTo(wallet.changeAddress || wallet.address || '');

    // Calculate and set recommended fee
    const tempTx = txBuilder.build().toEIP12Object();
    const recommendedFee = calculateRecommendedFee(tempTx);
    txBuilder.payFee(recommendedFee);

    // Build the final unsigned transaction
    const unsignedTx = txBuilder.build().toEIP12Object();
    console.log('Built transaction:', {
      inputs: unsignedTx.inputs?.length,
      outputs: unsignedTx.outputs?.length,
      fee: recommendedFee,
      size: JSON.stringify(unsignedTx).length
    });
    
    return unsignedTx;
  } catch (error) {
    console.error('Error building batch transfer transaction:', error);
    toast.error(`Transaction building error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
};

/**
 * Get a more meaningful message from InsufficientInputs errors
 */
export const formatInsufficientInputsError = (error: any): string => {
  if (error?.message?.includes('InsufficientInputs')) {
    // Try to extract token information from the error message
    const tokenIdMatch = error.message.match(/tokenId=([a-f0-9]+)/i);
    const requiredMatch = error.message.match(/required=([0-9]+)/i);
    
    if (tokenIdMatch && requiredMatch) {
      const tokenId = tokenIdMatch[1];
      const required = requiredMatch[1];
      
      return `Insufficient token balance: You need at least ${required} of token ${tokenId.substring(0, 8)}... to complete this transaction.`;
    }
    
    // If we can't extract specific token info, return a more generic but helpful message
    return 'Insufficient balance: You do not have enough tokens to complete this transaction. Please check your wallet balance.';
  }
  
  // For other errors, just return the message
  return error?.message || 'An unknown error occurred';
};

/**
 * Fetch token information from the Ergo blockchain API
 * @param tokenId The token ID to fetch information for
 * @returns The token information with decimals
 */
export const fetchTokenInfo = async (tokenId: string): Promise<{
  id: string;
  name: string;
  decimals: number;
} | null> => {
  try {
    const response = await fetch(`https://api.ergoplatform.com/api/v1/tokens/${tokenId}`);
    if (!response.ok) {
      console.warn(`Failed to fetch token info for ${tokenId}: ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    console.log(`Token info from API for ${tokenId}:`, data);
    
    return {
      id: data.id,
      name: data.name,
      decimals: data.decimals
    };
  } catch (error) {
    console.error(`Error fetching token info for ${tokenId}:`, error);
    return null;
  }
};

// Cache for token decimal information
const tokenDecimalsCache = new Map<string, number>();

/**
 * Get the correct decimals for a token, using API if needed
 * @param tokenId The token ID
 * @param providedDecimals The decimals value from the local token metadata
 * @returns The correct decimals value
 */
export const getCorrectTokenDecimals = async (
  tokenId: string, 
  providedDecimals: number = 0
): Promise<number> => {
  // Check cache first
  if (tokenDecimalsCache.has(tokenId)) {
    return tokenDecimalsCache.get(tokenId)!;
  }
  
  // Try to fetch from API
  const tokenInfo = await fetchTokenInfo(tokenId);
  if (tokenInfo && typeof tokenInfo.decimals === 'number') {
    // Cache the result
    tokenDecimalsCache.set(tokenId, tokenInfo.decimals);
    return tokenInfo.decimals;
  }
  
  // Fallback to provided decimals
  return providedDecimals;
}; 