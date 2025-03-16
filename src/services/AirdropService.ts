import { AirdropConfig, NFTDistribution, Recipient, TokenDistribution, WalletInfo } from "@/types";
import { toast } from "sonner";
import { isConnectedToNautilus, isNautilusAvailable } from "@/lib/wallet";
import { TransactionBuilder, OutputBuilder } from "@fleet-sdk/core";
import { signAndSubmitTx, calculateRecommendedFee } from "@/lib/transactions";

/**
 * Service to handle token and NFT airdrops using Fleet SDK
 */
export class AirdropService {
  /**
   * Process an airdrop based on the provided config
   * @param wallet Connected wallet info
   * @param config Airdrop configuration
   * @returns Transaction ID if successful
   */
  static async processAirdrop(
    wallet: WalletInfo,
    config: AirdropConfig
  ): Promise<string> {
    if (!isNautilusAvailable() || !(await isConnectedToNautilus())) {
      toast.error("Wallet not connected");
      throw new Error("Wallet not connected");
    }

    if (!config.recipients.length) {
      toast.error("No recipients specified for airdrop");
      throw new Error("No recipients specified for airdrop");
    }

    try {
      // Get all UTXOs from the wallet
      const utxos = await window.ergo?.get_utxos() || [];

      if (utxos.length === 0) {
        throw new Error("No UTXOs found in wallet");
      }

      // Initialize transaction builder with a default height
      // In a production app, you'd get the current blockchain height
      const txBuilder = new TransactionBuilder(1000000);
      
      // Add input boxes from the wallet
      txBuilder.from(utxos.map(convertErgoBoxToFleetBox));

      // Process token distributions
      if (config.tokenDistributions.length > 0) {
        await this.addTokenDistributions(txBuilder, config.tokenDistributions, config.recipients);
      }

      // Process NFT distributions
      if (config.nftDistributions.length > 0) {
        await this.addNFTDistributions(txBuilder, config.nftDistributions, config.recipients);
      }

      // Set change address and fee
      txBuilder.sendChangeTo(wallet.changeAddress || wallet.address || '');

      // Build the unsigned transaction
      const unsignedTx = txBuilder.build().toEIP12Object();
      
      // Calculate recommended fee based on transaction size/complexity
      const recommendedFee = calculateRecommendedFee(unsignedTx);
      const defaultFee = "1000000"; // 0.001 ERG
      
      // If we need a higher fee, rebuild the transaction with the recommended fee
      if (BigInt(recommendedFee) > BigInt(defaultFee)) {
        console.log(`Using higher recommended fee: ${recommendedFee} instead of default ${defaultFee}`);
        txBuilder.payFee(recommendedFee);
        const updatedUnsignedTx = txBuilder.build().toEIP12Object();
        console.log('Rebuilt transaction with higher fee');
        
        console.log('Airdrop transaction built, sending for signing and submission', {
          inputsCount: updatedUnsignedTx.inputs?.length || 0,
          outputsCount: updatedUnsignedTx.outputs?.length || 0,
          tokenDistributions: config.tokenDistributions.length,
          nftDistributions: config.nftDistributions.length,
          fee: recommendedFee
        });
        
        return await signAndSubmitTx(updatedUnsignedTx);
      }
      
      console.log('Airdrop transaction built, sending for signing and submission', {
        inputsCount: unsignedTx.inputs?.length || 0,
        outputsCount: unsignedTx.outputs?.length || 0,
        tokenDistributions: config.tokenDistributions.length,
        nftDistributions: config.nftDistributions.length,
        fee: defaultFee
      });

      // Use the enhanced signAndSubmitTx function instead of direct calls
      return await signAndSubmitTx(unsignedTx);
      
    } catch (error) {
      console.error("Error processing airdrop:", error);
      
      // Enhanced error logging
      if (typeof error === 'object' && error !== null) {
        console.error('Airdrop error details:', JSON.stringify(error, null, 2));
      }
      
      toast.error(`Airdrop error: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      throw error;
    }
  }

  /**
   * Add token distributions to the transaction
   */
  private static async addTokenDistributions(
    txBuilder: TransactionBuilder,
    tokenDistributions: TokenDistribution[],
    recipients: Recipient[]
  ): Promise<void> {
    for (const distribution of tokenDistributions) {
      const { token, type, amount } = distribution;
      
      for (const recipient of recipients) {
        const outputBuilder = new OutputBuilder(
          "1000000", // Minimum ERG required (0.001 ERG)
          recipient.address
        );
        
        // Calculate amount based on distribution type
        const tokenAmount = type === "total" 
          ? BigInt(Math.floor(amount / recipients.length * Math.pow(10, token.decimals))) 
          : BigInt(Math.floor(amount * Math.pow(10, token.decimals)));
        
        // Add token to output
        outputBuilder.addTokens([{
          tokenId: token.tokenId,
          amount: tokenAmount.toString()
        }]);
        
        // Add output to transaction
        txBuilder.to(outputBuilder);
      }
    }
  }

  /**
   * Add NFT distributions to the transaction
   */
  private static async addNFTDistributions(
    txBuilder: TransactionBuilder,
    nftDistributions: NFTDistribution[],
    recipients: Recipient[]
  ): Promise<void> {
    for (const distribution of nftDistributions) {
      const { type } = distribution;
      
      if (type === "1-to-1" && distribution.mapping) {
        // Handle 1-to-1 mapping
        for (const [nftId, recipientId] of Object.entries(distribution.mapping)) {
          const recipient = recipients.find(r => r.id === recipientId);
          
          if (recipient) {
            const outputBuilder = new OutputBuilder(
              "1000000", // Minimum ERG required (0.001 ERG)
              recipient.address
            );
            
            // Add NFT token (amount is always 1 for NFTs)
            outputBuilder.addTokens([{
              tokenId: nftId,
              amount: "1"
            }]);
            
            // Add output to transaction
            txBuilder.to(outputBuilder);
          }
        }
      } else if (type === "set" && distribution.collection) {
        // Handle sending the entire set to each recipient
        for (const recipient of recipients) {
          for (const nft of distribution.collection.nfts.filter(n => n.selected)) {
            const outputBuilder = new OutputBuilder(
              "1000000", // Minimum ERG required (0.001 ERG)
              recipient.address
            );
            
            // Add NFT token
            outputBuilder.addTokens([{
              tokenId: nft.id,
              amount: "1"
            }]);
            
            // Add output to transaction
            txBuilder.to(outputBuilder);
          }
        }
      } else if (type === "random" && distribution.collection) {
        // Handle random distribution
        const selectedNFTs = distribution.collection.nfts.filter(n => n.selected);
        
        // Skip if no NFTs are selected
        if (selectedNFTs.length === 0) continue;
        
        // Distribute NFTs randomly among recipients
        const shuffledNFTs = [...selectedNFTs].sort(() => 0.5 - Math.random());
        
        for (let i = 0; i < Math.min(shuffledNFTs.length, recipients.length); i++) {
          const nft = shuffledNFTs[i];
          const recipient = recipients[i % recipients.length];
          
          const outputBuilder = new OutputBuilder(
            "1000000", // Minimum ERG required (0.001 ERG)
            recipient.address
          );
          
          // Add NFT token
          outputBuilder.addTokens([{
            tokenId: nft.id,
            amount: "1"
          }]);
          
          // Add output to transaction
          txBuilder.to(outputBuilder);
        }
      }
    }
  }
}

/**
 * Convert an Ergo box from Nautilus format to Fleet SDK Box format
 */
const convertErgoBoxToFleetBox = (box: any) => {
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