import { Collection, NFT, Token } from "@/types";
import { isConnectedToNautilus, isNautilusAvailable } from "@/lib/wallet";
import { toast } from "sonner";

// Placeholder for NFT metadata fetching functions
// In a real app, this would come from a blockchain explorer API or IPFS
const TOKEN_METADATA_API = "https://api.ergoplatform.com/api/v1/tokens";

// Interface for Nautilus wallet balance response
interface NautilusWalletBalance {
  confirmed: number;
  unconfirmed: number;
  height: number;
  tokens?: {
    tokenId: string;
    amount: number;
    decimals?: number;
    name?: string;
    description?: string;
    icon?: string;
  }[];
}

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
   * Groups NFTs by collection ID (if available) or creates "Uncategorized" collection
   */
  static async getWalletCollections(): Promise<Collection[]> {
    if (!isNautilusAvailable() || !(await isConnectedToNautilus())) {
      toast.error("Wallet not connected");
      throw new Error("Wallet not connected");
    }

    try {
      // Get all UTXOs from the wallet
      const utxos = await window.ergo?.get_utxos() || [];
      const nfts: NFT[] = [];
      const collections = new Map<string, Collection>();

      // First pass - identify NFTs (tokens with amount = 1) from the wallet
      for (const box of utxos) {
        if (box.assets && box.assets.length > 0) {
          for (const asset of box.assets) {
            // Simple heuristic: tokens with amount = 1 and with registers are likely NFTs
            if (asset.amount === 1) {
              // Extract NFT metadata from registers if available
              let name = asset.name || asset.tokenId.substring(0, 8);
              let description = "";
              let imageUrl = "";
              let collectionId = "uncategorized";
              
              // Try to extract more metadata if available in registers
              if (box.additionalRegisters) {
                // Try to decode registers that might contain NFT info
                if (box.additionalRegisters.R4) {
                  try {
                    // This is a simplification - in a real app you would properly decode register values
                    // For now we'll just use the value directly
                    name = box.additionalRegisters.R4;
                  } catch (e) {}
                }
                
                if (box.additionalRegisters.R5) {
                  try {
                    description = box.additionalRegisters.R5;
                  } catch (e) {}
                }
                
                if (box.additionalRegisters.R6) {
                  try {
                    imageUrl = box.additionalRegisters.R6;
                  } catch (e) {}
                }
                
                // R7 often contains collection info
                if (box.additionalRegisters.R7) {
                  try {
                    collectionId = box.additionalRegisters.R7;
                  } catch (e) {}
                }
              }
              
              // Try to determine collection from the name pattern (e.g., "Collection #123")
              if (collectionId === "uncategorized" && name.includes("#")) {
                const parts = name.split("#");
                if (parts.length > 1) {
                  const collectionName = parts[0].trim();
                  if (collectionName) {
                    collectionId = collectionName;
                  }
                }
              }
              
              // Add the NFT to our list
              nfts.push({
                id: asset.tokenId,
                name,
                description,
                imageUrl: imageUrl || `https://via.placeholder.com/150?text=${encodeURIComponent(name)}`,
                collectionId,
                selected: false
              });
            }
          }
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
          // Create new collection with a more readable name
          const collectionName = collId === "uncategorized" 
            ? "Uncategorized" 
            : collId.replace(/([A-Z])/g, ' $1').trim(); // Add spaces before capital letters
          
          collections.set(collId, {
            id: collId,
            name: collectionName,
            nfts: [nft],
            selected: false
          });
        }
      });

      // Convert to array and sort collections by name
      return Array.from(collections.values())
        .sort((a, b) => a.name.localeCompare(b.name));
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