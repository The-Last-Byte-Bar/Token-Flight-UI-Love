import { Collection, NFT, Token } from "@/types/index";
import { isConnectedToNautilus, isNautilusAvailable } from "@/lib/wallet";
import { toast } from "sonner";

// API endpoint for token and box metadata
const TOKEN_METADATA_API = "https://api.ergoplatform.com/api/v1/tokens";
const BOX_METADATA_API = "https://api.ergoplatform.com/api/v1/boxes";

// Add a cache for collections to avoid redundant fetching
const collectionsCache = new Map<string, Collection[]>();
const tokenDetailsCache = new Map<string, Token>();

/**
 * Service to handle token and NFT collection discovery from the connected wallet
 */
export class CollectionService {
  /**
   * Get all tokens from the connected wallet with pagination support
   * @param limit Maximum number of tokens to fetch (default: 20)
   * @param offset Starting index for pagination (default: 0)
   */
  static async getWalletTokens(limit: number = 20, offset: number = 0): Promise<{ tokens: Token[], total: number }> {
    if (!isNautilusAvailable() || !(await isConnectedToNautilus())) {
      toast.error("Wallet not connected");
      throw new Error("Wallet not connected");
    }

    try {
      // Get all UTXOs from the wallet
      const utxos = await window.ergo?.get_utxos() || [];
      const tokensMap = new Map<string, Token>();
      
      // Get token information from wallet
      const walletBalance = await window.ergo?.get_balance() ?? {};
      const tokenInfoMap = new Map<string, any>();
      
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
            
            if (tokensMap.has(tokenId)) {
              // Add to existing amount - using number as specified in Token interface
              const existingToken = tokensMap.get(tokenId)!;
              tokensMap.set(tokenId, {
                ...existingToken,
                amount: existingToken.amount + Number(amount)
              });
            } else {
              // Add new token - using number as specified in Token interface
              tokensMap.set(tokenId, {
                tokenId: tokenId,
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

      // Convert to array for pagination
      const allTokens = Array.from(tokensMap.values());
      const totalTokens = allTokens.length;
      
      // Apply pagination
      const pagedTokens = allTokens.slice(offset, offset + limit);
      
      // Only enhance token metadata for the current page
      for (const token of pagedTokens) {
        if (!token.name || token.name === token.tokenId.substring(0, 8)) {
          try {
            const enhancedToken = await this.getTokenDetails(token.tokenId);
            if (enhancedToken.name !== token.tokenId.substring(0, 8)) {
              token.name = enhancedToken.name;
              token.description = enhancedToken.description;
              token.icon = enhancedToken.icon;
            }
          } catch (error) {
            console.warn(`Could not fetch details for token ${token.tokenId}`);
          }
        }
      }

      return { tokens: pagedTokens, total: totalTokens };
    } catch (error) {
      console.error("Error getting wallet tokens:", error);
      toast.error("Failed to fetch wallet tokens");
      throw error;
    }
  }

  /**
   * Get NFT collections from the wallet
   * Groups NFTs by collection ID using the R7 register data
   * @param forceRefresh Whether to bypass the cache and force a fresh fetch
   */
  static async getWalletCollections(forceRefresh: boolean = false): Promise<Collection[]> {
    if (!isNautilusAvailable() || !(await isConnectedToNautilus())) {
      toast.error("Wallet not connected");
      throw new Error("Wallet not connected");
    }

    // Get current wallet address to use as a cache key
    const walletAddress = await window.ergo?.get_change_address();
    const cacheKey = `collections_${walletAddress}`;
    
    // Return cached collections if available and force refresh is not requested
    if (!forceRefresh && collectionsCache.has(cacheKey)) {
      console.log('Returning cached collections');
      return collectionsCache.get(cacheKey) || [];
    }

    try {
      // Get all tokens from wallet - without pagination since we need to scan all for NFTs
      const { tokens } = await this.getWalletTokens(1000, 0);
      
      console.log(`Found ${tokens.length} tokens in wallet`);
      
      // Fetch box data for each token to extract collection info
      const nfts: NFT[] = [];
      const collections = new Map<string, Collection>();
      const collectionLookup = new Map<string, string>();
      
      // Process tokens in batches to improve performance
      const BATCH_SIZE = 5; // Process 5 tokens at a time
      
      for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
        const batch = tokens.slice(i, i + BATCH_SIZE);
        const promises = batch.map(token => this.processTokenForCollection(token, collections, collectionLookup, nfts));
        
        // Wait for all tokens in the batch to be processed before moving to the next batch
        await Promise.all(promises);
        
        // Log progress every 20 tokens
        if ((i + BATCH_SIZE) % 20 === 0 || i + BATCH_SIZE >= tokens.length) {
          console.log(`Processed ${Math.min(i + BATCH_SIZE, tokens.length)}/${tokens.length} tokens for collections`);
        }
      }
      
      // Convert map to array
      const collectionsArray = Array.from(collections.values());
      
      // Cache the results keyed by wallet address
      collectionsCache.set(cacheKey, collectionsArray);
      
      return collectionsArray;
    } catch (error) {
      console.error("Error getting wallet collections:", error);
      throw error;
    }
  }

  /**
   * Process a single token to determine if it's part of a collection
   * Extracted into a separate method to support batched processing
   */
  private static async processTokenForCollection(
    token: Token, 
    collections: Map<string, Collection>,
    collectionLookup: Map<string, string>,
    nfts: NFT[]
  ): Promise<void> {
    try {
      // Skip tokens we've already processed
      if (collectionLookup.has(token.tokenId)) {
        return;
      }
      
      // Use the correct endpoint format for fetching box data by token ID
      const response = await fetch(`https://api.ergoplatform.com/api/v1/boxes/${token.tokenId}`);
      
      if (!response.ok) {
        console.warn(`Failed to fetch box data for token ${token.tokenId}`);
        return;
      }
      
      const boxData = await response.json();
      
      // Extract metadata from registers
      const name = token.name;
      let description = token.description || "";
      let imageUrl = token.icon || "";
      let collectionId: string | null = null;
      
      // Check registers for metadata
      if (boxData.additionalRegisters) {
        const registers = boxData.additionalRegisters;
        
        // Check R7 for collection ID - this is the key for collection identification
        if (registers.R7) {
          try {
            // Extract the collection ID from R7 register
            const r7Value = registers.R7.renderedValue || registers.R7.serializedValue;
            
            if (r7Value) {
              let tokenId = r7Value;
              
              // Remove prefix if present
              // Common prefixes in Ergo registers: 0e20 for Coll[Byte]
              if (tokenId.startsWith("0e20")) {
                tokenId = tokenId.substring(4);
              }
              // Handle rendered value format where the R7 value contains the token ID
              else if (typeof tokenId === 'string' && tokenId.match(/[0-9a-fA-F]{64}/)) {
                // Extract the 64-character hex string (token ID)
                const match = tokenId.match(/([0-9a-fA-F]{64})/);
                if (match) {
                  tokenId = match[1];
                }
              }
              
              // Check if this matches one of the token IDs in the box assets
              const matchingAsset = boxData.assets?.find((a: any) => a.tokenId === tokenId);
              
              if (matchingAsset) {
                collectionId = tokenId;
                collectionLookup.set(token.tokenId, collectionId);
              }
            }
          } catch (e) {
            console.warn(`Failed to decode R7 register for ${token.tokenId}:`, e);
          }
        }
        
        // Get other metadata from registers if not already available
        try {
          if (!description && registers.R5 && registers.R5.renderedValue) {
            description = registers.R5.renderedValue;
          }
        } catch (e) {
          // Ignore errors when parsing R5
        }
        
        try {
          if (!imageUrl && registers.R9 && registers.R9.renderedValue) {
            // Sometimes R9 contains image URL or IPFS hash
            imageUrl = registers.R9.renderedValue;
            if (imageUrl.startsWith("ipfs://")) {
              imageUrl = `https://ipfs.io/ipfs/${imageUrl.substring(7)}`;
            }
          }
        } catch (e) {
          // Ignore errors when parsing R9
        }
      }
      
      // Create the NFT object if it belongs to a collection
      if (collectionId) {
        const nftObj: NFT = {
          tokenId: token.tokenId,
          name,
          description,
          imageUrl: "", // Don't use placeholder images that cause errors
          collectionId: collectionId,
          selected: false
        };
        
        nfts.push(nftObj);
        
        // Add to existing collection or create a new one
        if (collections.has(collectionId)) {
          // Add to existing collection
          const collection = collections.get(collectionId)!;
          collection.nfts.push(nftObj);
        } else {
          // Try to get a better collection name
          let collectionName = `Collection #${collections.size + 1}`;
          let collectionDescription = "";
          
          try {
            // This might be a token ID that represents the collection
            const cachedDetails = tokenDetailsCache.get(collectionId);
            
            if (cachedDetails) {
              collectionName = cachedDetails.name;
              collectionDescription = cachedDetails.description || "";
            } else {
              const response = await fetch(`${TOKEN_METADATA_API}/${collectionId}`);
              if (response.ok) {
                const data = await response.json();
                if (data.name) {
                  collectionName = data.name;
                  collectionDescription = data.description || "";
                  
                  // Cache the token details
                  tokenDetailsCache.set(collectionId, {
                    tokenId: collectionId,
                    name: data.name,
                    description: data.description || "",
                    amount: 0,
                    decimals: 0
                  });
                }
              }
            }
          } catch (error) {
            console.warn(`Could not fetch collection details for ${collectionId}:`, error);
          }
          
          // Create new collection
          collections.set(collectionId, {
            id: collectionId,
            name: collectionName,
            description: collectionDescription,
            nfts: [nftObj],
            selected: false
          });
        }
      }
    } catch (error) {
      console.error(`Error processing token ${token.tokenId}:`, error);
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
              tokenId: tokenId,
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
        tokenId: data.id,
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
        tokenId: tokenId,
        name: tokenId.substring(0, 8),
        amount: 0,
        decimals: 0,
        description: "Token details unavailable",
        icon: ""
      };
    }
  }
}
