
import { Collection, NFT, Token } from "@/types";
import { isConnectedToNautilus, isNautilusAvailable } from "@/lib/wallet";
import { toast } from "sonner";

// API endpoint for token and box metadata
const TOKEN_METADATA_API = "https://api.ergoplatform.com/api/v1/tokens";
const BOX_METADATA_API = "https://api.ergoplatform.com/api/v1/boxes";

/**
 * Service to handle token and NFT collection discovery from the connected wallet
 */
export class CollectionService {
  /**
   * Get all tokens from the connected wallet
   */
  static async getWalletTokens(): Promise<Token[]> {
    if (!isNautilusAvailable() || !(await isConnectedToNautilus())) {
      toast.error("Wallet not connected");
      throw new Error("Wallet not connected");
    }

    try {
      // Get all UTXOs from the wallet
      const utxos = await window.ergo?.get_utxos() || [];
      const tokens = new Map<string, Token>();
      
      // Get token information from wallet
      const walletBalance = await window.ergo?.get_balance() ?? {};
      const tokenInfoMap = new Map();
      
      // Process any token info available from Nautilus
      if (typeof walletBalance === 'object' && 
          'tokens' in walletBalance && Array.isArray(walletBalance.tokens)) {
        walletBalance.tokens.forEach((token: any) => {
          if (token.tokenId && token.name) {
            tokenInfoMap.set(token.tokenId, {
              name: token.name || token.tokenId.substring(0, 8),
              decimals: token.decimals || 0,
              description: token.description || "",
              icon: token.icon || ""
            });
          }
        });
      }

      // Extract tokens from boxes
      utxos.forEach((box: any) => {
        if (box.assets && box.assets.length > 0) {
          box.assets.forEach((asset: any) => {
            const { tokenId, amount } = asset;
            const tokenInfo = tokenInfoMap.get(tokenId) || {
              name: asset.name || tokenId.substring(0, 8),
              decimals: asset.decimals || 0,
              description: "",
              icon: ""
            };
            
            if (tokens.has(tokenId)) {
              // Add to existing amount
              const existingToken = tokens.get(tokenId)!;
              tokens.set(tokenId, {
                ...existingToken,
                amount: existingToken.amount + Number(amount)
              });
            } else {
              // Add new token
              tokens.set(tokenId, {
                id: tokenId,
                name: tokenInfo.name,
                amount: Number(amount),
                decimals: tokenInfo.decimals,
                description: tokenInfo.description || "",
                icon: tokenInfo.icon || ""
              });
            }
          });
        }
      });

      // Try to enhance token metadata for any tokens that don't have proper names
      const tokensArray = Array.from(tokens.values());
      for (const token of tokensArray) {
        if (!token.name || token.name === token.id.substring(0, 8)) {
          try {
            const enhancedToken = await this.getTokenDetails(token.id);
            if (enhancedToken.name !== token.id.substring(0, 8)) {
              token.name = enhancedToken.name;
              token.description = enhancedToken.description;
              token.icon = enhancedToken.icon;
            }
          } catch (error) {
            console.warn(`Could not fetch details for token ${token.id}`);
          }
        }
      }

      return tokensArray;
    } catch (error) {
      console.error("Error getting wallet tokens:", error);
      toast.error("Failed to fetch wallet tokens");
      throw error;
    }
  }

  /**
   * Get NFT collections from the wallet
   * Groups NFTs by collection ID using the R7 register data
   */
  static async getWalletCollections(): Promise<Collection[]> {
    if (!isNautilusAvailable() || !(await isConnectedToNautilus())) {
      toast.error("Wallet not connected");
      throw new Error("Wallet not connected");
    }

    try {
      // Get all UTXOs from the wallet
      const utxos = await window.ergo?.get_utxos() || [];
      
      // First pass: identify potential NFTs (tokens with amount = 1)
      const potentialNFTs: {tokenId: string, name?: string}[] = [];
      
      for (const box of utxos) {
        if (box.assets && box.assets.length > 0) {
          for (const asset of box.assets) {
            if (asset.amount === 1) {
              potentialNFTs.push({
                tokenId: asset.tokenId,
                name: asset.name
              });
            }
          }
        }
      }
      
      console.log(`Found ${potentialNFTs.length} potential NFTs in wallet`);
      
      // Second pass: fetch box data for each potential NFT to extract collection info
      const nfts: NFT[] = [];
      const collections = new Map<string, Collection>();
      const collectionLookup = new Map<string, string>(); // tokenId -> collectionId
      
      // Process each potential NFT
      for (const nft of potentialNFTs) {
        try {
          // Use the correct endpoint format for fetching box data by token ID
          const response = await fetch(`${BOX_METADATA_API}/byTokenId/${nft.tokenId}`);
          
          if (!response.ok) {
            console.warn(`Failed to fetch box data for token ${nft.tokenId}`);
            continue;
          }
          
          const boxesData = await response.json();
          
          // The endpoint returns items array
          if (!boxesData.items || boxesData.items.length === 0) {
            console.warn(`No boxes found for token ${nft.tokenId}`);
            continue;
          }
          
          // Find the box where this token was minted (it will have the NFT metadata)
          const boxData = boxesData.items.find((box: any) => 
            box.assets && box.assets.some((asset: any) => 
              asset.tokenId === nft.tokenId && asset.amount === 1
            )
          ) || boxesData.items[0];
          
          // Extract metadata from registers
          let name = nft.name || nft.tokenId.substring(0, 8);
          let description = "";
          let imageUrl = "";
          let collectionId: string | null = null;
          
          // Process asset information
          const assetInfo = boxData.assets?.find((a: any) => a.tokenId === nft.tokenId);
          if (assetInfo && assetInfo.name) {
            name = assetInfo.name;
          }
          
          // Check registers for metadata
          if (boxData.additionalRegisters) {
            const registers = boxData.additionalRegisters;
            
            // Check R7 for collection ID - this is the key improvement
            if (registers.R7) {
              try {
                // Extract the collection ID from R7 register
                const r7Value = registers.R7.renderedValue || registers.R7.serializedValue;
                
                if (r7Value) {
                  // Remove the "0e20" prefix if present (common in Ergo registers for Coll[Byte])
                  const tokenId = r7Value.startsWith("0e20") ? r7Value.substring(4) : r7Value;
                  
                  // Check if this matches one of the token IDs in the box assets
                  // If it does, it's a collection marker
                  const matchingAsset = boxData.assets?.find((a: any) => a.tokenId === tokenId);
                  
                  if (matchingAsset) {
                    collectionId = tokenId;
                    collectionLookup.set(nft.tokenId, collectionId);
                    console.log(`NFT ${name} (${nft.tokenId}) belongs to collection ${collectionId}`);
                  }
                }
              } catch (e) {
                console.warn(`Failed to decode R7 register for ${nft.tokenId}:`, e);
              }
            }
            
            // Get other metadata from registers
            try {
              if (registers.R5 && registers.R5.renderedValue) {
                description = registers.R5.renderedValue;
                
                // Sometimes collection info is in R5 as "Collection: X"
                if (typeof description === 'string' && description.includes('Collection:')) {
                  const parts = description.split('Collection:');
                  if (parts.length > 1 && !collectionId) {
                    const collName = parts[1].trim();
                    collectionId = `collection_${Buffer.from(collName).toString('hex')}`;
                  }
                }
              }
            } catch (e) {}
            
            try {
              if (registers.R9 && registers.R9.renderedValue) {
                // Sometimes R9 contains image URL or IPFS hash
                imageUrl = registers.R9.renderedValue;
                if (imageUrl.startsWith("ipfs://")) {
                  imageUrl = `https://ipfs.io/ipfs/${imageUrl.substring(7)}`;
                }
              }
            } catch (e) {}
          }
          
          // Create the NFT object
          const nftObj: NFT = {
            id: nft.tokenId,
            name,
            description,
            imageUrl: imageUrl || `https://via.placeholder.com/150?text=${encodeURIComponent(name)}`,
            collectionId: collectionId || "uncategorized",
            selected: false
          };
          
          nfts.push(nftObj);
          
        } catch (error) {
          console.error(`Error processing NFT ${nft.tokenId}:`, error);
        }
      }
      
      // Group NFTs by collection
      nfts.forEach(nft => {
        const collId = nft.collectionId || "uncategorized";
        
        if (collections.has(collId)) {
          // Add to existing collection
          const collection = collections.get(collId)!;
          collection.nfts.push(nft);
        } else {
          // Create new collection
          let collectionName = collId === "uncategorized" 
            ? "Uncategorized" 
            : `Collection #${collections.size + 1}`;
            
          // Try to get a better collection name from a token with same ID
          if (collId !== "uncategorized") {
            // This might be a token ID that represents the collection
            const response = await fetch(`${TOKEN_METADATA_API}/${collId}`);
            if (response.ok) {
              const tokenData = await response.json();
              if (tokenData && tokenData.name) {
                collectionName = tokenData.name;
              }
            }
          }
          
          collections.set(collId, {
            id: collId,
            name: collectionName,
            nfts: [nft],
            selected: false
          });
        }
      });
      
      // Convert to array and sort collections by size (most NFTs first)
      return Array.from(collections.values())
        .sort((a, b) => b.nfts.length - a.nfts.length);
    } catch (error) {
      console.error("Error getting NFT collections:", error);
      toast.error("Failed to fetch NFT collections");
      throw error;
    }
  }

  /**
   * Get detailed information about a specific token
   */
  static async getTokenDetails(tokenId: string): Promise<Token> {
    try {
      // First try to get token from Nautilus wallet if available
      if (await isConnectedToNautilus()) {
        const walletBalance = await window.ergo?.get_balance() ?? {};
        
        if (typeof walletBalance === 'object' && 
            'tokens' in walletBalance && Array.isArray(walletBalance.tokens)) {
          const foundToken = walletBalance.tokens.find((t: any) => t.tokenId === tokenId);
          if (foundToken) {
            return {
              id: tokenId,
              name: foundToken.name || tokenId.substring(0, 8),
              amount: foundToken.amount || 0,
              decimals: foundToken.decimals || 0,
              description: foundToken.description || "",
              icon: foundToken.icon || ""
            };
          }
        }
      }
      
      // If not found in wallet, fetch from API
      const response = await fetch(`${TOKEN_METADATA_API}/${tokenId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch token details: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        id: data.id,
        name: data.name || tokenId.substring(0, 8),
        amount: data.amount || 0,
        decimals: data.decimals || 0,
        description: data.description || "",
        icon: data.icon || ""
      };
    } catch (error) {
      console.error(`Error fetching token details for ${tokenId}:`, error);
      
      // Return a basic token with the ID
      return {
        id: tokenId,
        name: tokenId.substring(0, 8),
        amount: 0,
        decimals: 0,
        description: "Token details unavailable",
        icon: ""
      };
    }
  }
}
