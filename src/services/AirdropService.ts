import { 
  AirdropConfig, 
  NFTDistribution, 
  Recipient, 
  TokenDistribution,
  WalletInfo 
} from '@/types/index';
import { toast } from "sonner";
import { isConnectedToNautilus, isNautilusAvailable } from "@/lib/wallet";
import { TransactionBuilder, OutputBuilder } from '@fleet-sdk/core';
import { signAndSubmitTx, calculateRecommendedFee, buildBatchTransferTx } from "@/lib/transactions";
import { createDebugLogger, flushLogs } from '@/hooks/useDebugLog';

const debug = createDebugLogger('AirdropService');

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
      // Prepare distributions for each recipient
      const distributions = config.recipients.map(recipient => {
        const tokens: { tokenId: string; amount: string | number | bigint; decimals: number }[] = [];
        const nfts: { tokenId: string; amount: string }[] = [];

        // Add token distributions
        for (const tokenDist of config.tokenDistributions) {
          const { token, type, amount } = tokenDist;
          const tokenAmount = type === "total" 
            ? amount / config.recipients.length
            : amount;
          
          tokens.push({
            tokenId: token.tokenId,
            amount: tokenAmount,
            decimals: token.decimals
          });
        }

        // Add NFT distributions
        for (const nftDist of config.nftDistributions) {
          const { type, collection, mapping, amount } = nftDist;
          
          if (type === "1-to-1" && mapping) {
            // For 1-to-1 mapping, find the NFT assigned to this recipient
            const nftId = Object.entries(mapping).find(([_, recipientId]) => recipientId === recipient.id)?.[0];
            if (nftId) {
              nfts.push({ 
                tokenId: nftId,
                amount: amount.toString()
              });
            }
          } else if (type === "total" && collection) {
            // For total distribution, add all selected NFTs
            const selectedNFTs = collection.nfts.filter(n => n.selected);
            selectedNFTs.forEach(nft => {
              nfts.push({ 
                tokenId: nft.id || nft.tokenId,
                amount: amount.toString()
              });
            });
          } else if (type === "random" && collection) {
            // For random distribution, we'll handle this separately
            // as it requires shuffling and special handling
            const selectedNFTs = collection.nfts.filter(n => n.selected);
            if (selectedNFTs.length > 0) {
              const randomIndex = Math.floor(Math.random() * selectedNFTs.length);
              nfts.push({ 
                tokenId: selectedNFTs[randomIndex].id || selectedNFTs[randomIndex].tokenId,
                amount: amount.toString()
              });
            }
          }
        }

        return {
          address: recipient.address,
          tokens,
          nfts
        };
      });

      // Build and submit the transaction
      const unsignedTx = await buildBatchTransferTx(wallet, distributions);
      const txId = await signAndSubmitTx(unsignedTx);

      toast.success(`Airdrop transaction submitted successfully! Transaction ID: ${txId}`);
      return txId;
    } catch (error) {
      console.error("Error processing airdrop:", error);
      toast.error(`Airdrop failed: ${error instanceof Error ? error.message : "Unknown error"}`);
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
    // Process each NFT distribution separately
    for (const distribution of nftDistributions) {
      // Get the specific amount for this distribution
      const { amount } = distribution;
      
      console.log(`Processing NFT distribution with amount: ${amount}`);
      
      // Get the NFTs to distribute
      const nftsToDistribute = distribution.nft 
        ? [distribution.nft]
        : distribution.collection?.nfts.filter(n => n.tokenId !== distribution.collection?.id) || [];
      
      if (nftsToDistribute.length === 0) continue;
      
      // For sequential distribution, distribute NFTs in order
      for (const recipient of recipients) {
        // Create output box for each recipient
        const outputBuilder = new OutputBuilder(
          "1000000", // Minimum ERG required (0.001 ERG)
          recipient.address
        );
        
        // Add the specified amount of each NFT to this recipient
        for (const nft of nftsToDistribute) {
          console.log(`Adding NFT ${nft.name || nft.tokenId.substring(0, 8)} with amount ${amount} to recipient ${recipient.address.substring(0, 8)}...`);
          outputBuilder.addTokens([{
            tokenId: nft.tokenId,
            amount: amount.toString() // Use the specific amount for this distribution
          }]);
        }
        
        // Add output to transaction
        txBuilder.to(outputBuilder);
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