import { 
  Box,
  OutputBuilder, 
  SByte, 
  SColl, 
  SConstant, 
  SInt,
  TransactionBuilder
} from '@fleet-sdk/core';
import { WalletInfo } from '@/types';
import { toast } from 'sonner';
import { ERG_DECIMALS } from './constants';
import { isConnectedToNautilus, isNautilusAvailable } from './wallet';

// Fee amount in nanoERGs
export const DEFAULT_TX_FEE = "1000000";

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
    return utxos.map(convertErgoBoxToFleetBox);
  } catch (error) {
    console.error('Error getting wallet UTXOs:', error);
    throw error;
  }
};

/**
 * Convert an Ergo box from Nautilus format to Fleet SDK Box format
 */
const convertErgoBoxToFleetBox = (box: any): Box<string> => {
  return {
    boxId: box.boxId,
    transactionId: box.txId,
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

  try {
    // Get input boxes from wallet
    const inputBoxes = await getWalletBoxes();
    
    if (inputBoxes.length === 0) {
      throw new Error('No input boxes available in wallet');
    }

    // Initialize transaction builder with the current block height
    // We'll use a default height of 1000000, but in a production app 
    // you would want to get the current height from the blockchain
    const txBuilder = new TransactionBuilder(1000000);
    
    // Add input boxes
    txBuilder.from(inputBoxes);

    // Add outputs for each recipient
    for (const recipient of recipients) {
      const amountBigInt = BigInt(recipient.amount.toString());
      
      const outputBuilder = new OutputBuilder(
        recipient.address,
        tokenId 
          ? "1000000" // Minimum ERG value required for token transfer (1 milliERG)
          : amountBigInt.toString() // Or the ERG amount if sending ERG
      );

      // Add token if sending tokens
      if (tokenId) {
        outputBuilder.addTokens([{
          tokenId,
          amount: amountBigInt.toString()
        }]);
      }

      // Add this output to the transaction
      txBuilder.to(outputBuilder);
    }

    // Set change address
    txBuilder.sendChangeTo(wallet.changeAddress || wallet.address || '');

    // Set transaction fee
    txBuilder.payFee(fee);

    // Build the unsigned transaction
    const unsignedTx = txBuilder.build().toEIP12Object();

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
    // Sign the transaction using the wallet
    const signedTx = await window.ergo?.sign_tx(unsignedTx);
    
    if (!signedTx) {
      throw new Error('Failed to sign transaction');
    }
    
    // Submit the signed transaction
    const txId = await window.ergo?.submit_tx(signedTx);
    
    if (!txId) {
      throw new Error('Failed to submit transaction');
    }
    
    return txId;
  } catch (error) {
    console.error('Error signing/submitting transaction:', error);
    toast.error(`Transaction error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
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
      wallet.address || '',
      "1000000" // Minimum value required for token (1 milliERG)
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