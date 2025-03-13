import { AirdropConfig, NFTDistribution, Recipient, TokenDistribution, WalletInfo } from "@/types";
import { toast } from "sonner";
import { isConnectedToNautilus, isNautilusAvailable } from "@/lib/wallet";
import { TransactionBuilder, OutputBuilder } from "@fleet-sdk/core";

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
      txBuilder.payFee("1000000"); // 0.001 ERG fee

      // Build the unsigned transaction
      const unsignedTx = txBuilder.build().toEIP12Object();

      // Sign the transaction
      const signedTx = await window.ergo?.sign_tx(unsignedTx);
      
      if (!signedTx) {
        throw new Error("Failed to sign transaction");
      }
      
      // Submit the transaction
      const txId = await window.ergo?.submit_tx(signedTx);
      
      if (!txId) {
        throw new Error("Failed to submit transaction");
      }
      
      return txId;
    } catch (error) {
      console.error("Error processing airdrop:", error);
      toast.error(`Airdrop error: ${error instanceof Error ? error.message : "Unknown error"}`);
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
          recipient.address,
          "1000000" // Minimum ERG required (0.001 ERG)
        );
        
        // Calculate amount based on distribution type
        const tokenAmount = type === "total" 
          ? BigInt(Math.floor(amount / recipients.length * Math.pow(10, token.decimals))) 
          : BigInt(Math.floor(amount * Math.pow(10, token.decimals)));
        
        // Add token to output
        outputBuilder.addTokens([{
          tokenId: token.id,
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
              recipient.address,
              "1000000" // Minimum ERG required (0.001 ERG)
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
              recipient.address,
              "1000000" // Minimum ERG required (0.001 ERG)
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
            recipient.address,
            "1000000" // Minimum ERG required (0.001 ERG)
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