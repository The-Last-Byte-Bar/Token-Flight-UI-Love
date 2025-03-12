import { NFTInfo, CollectionInfo, TokenInfo } from '../../models/wallet.model';
import ergoPlatformApi from '../api/ergo-platform-api';

/**
 * Decodes register value from hexadecimal to readable format
 * @param registerHex Register value in hex format
 * @returns Decoded value
 */
function decodeRegister(registerHex: string): string | null {
  try {
    // This is a simplified implementation
    // In a complete implementation, we'd use Fleet SDK's serializer to decode the values
    if (registerHex.startsWith('0e')) {
      // UTF-8 String encoding
      const hex = registerHex.slice(2);
      let str = '';
      for (let i = 0; i < hex.length; i += 2) {
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
      }
      return str;
    }
    return null;
  } catch (error) {
    console.error('Error decoding register:', error);
    return null;
  }
}

/**
 * Extracts collection information from box data
 * @param boxData Box data from Ergo Platform API
 * @returns Collection information
 */
function extractCollectionInfo(boxData: any): { 
  collectionId: string | null; 
  collectionName: string | null; 
  isPartOfCollection: boolean;
  metadata: Record<string, any>;
} {
  const registers = boxData.additionalRegisters || {};
  
  // Decode register values from hex to readable format
  const decodedR4 = registers.R4 ? decodeRegister(registers.R4) : null;
  const decodedR5 = registers.R5 ? decodeRegister(registers.R5) : null;
  const decodedR6 = registers.R6 ? decodeRegister(registers.R6) : null;
  
  // Initialize collection info
  const metadata: Record<string, any> = {};
  let collectionInfo = {
    collectionId: null as string | null,
    collectionName: null as string | null,
    isPartOfCollection: false,
    metadata
  };
  
  // Look for collection identifiers
  if (decodedR4 && decodedR4.includes('Collection:')) {
    const collectionParts = decodedR4.split('Collection:');
    if (collectionParts.length > 1) {
      collectionInfo.collectionName = collectionParts[1].trim();
      collectionInfo.isPartOfCollection = true;
    }
  }
  
  // Store metadata
  if (decodedR4) metadata.R4 = decodedR4;
  if (decodedR5) metadata.R5 = decodedR5;
  if (decodedR6) metadata.R6 = decodedR6;
  
  // Generate collection ID if not explicitly found
  if (collectionInfo.isPartOfCollection && !collectionInfo.collectionId && collectionInfo.collectionName) {
    collectionInfo.collectionId = `collection_${Buffer.from(collectionInfo.collectionName).toString('hex')}`;
  }
  
  return collectionInfo;
}

/**
 * Identifies NFT collections from a list of tokens
 * @param tokens List of tokens
 * @returns Collections identified from tokens
 */
export async function discoverCollections(tokens: TokenInfo[]): Promise<{
  collections: CollectionInfo[];
  standaloneNfts: NFTInfo[];
}> {
  const potentialNfts = tokens.filter(token => token.amount === BigInt(1));
  const collections: Map<string, CollectionInfo> = new Map();
  const standaloneNfts: NFTInfo[] = [];
  
  // Process each potential NFT
  for (const token of potentialNfts) {
    try {
      const boxData = await ergoPlatformApi.getBoxByTokenId(token.tokenId);
      const { collectionId, collectionName, isPartOfCollection, metadata } = extractCollectionInfo(boxData);
      
      // Create NFT object
      const nftInfo: NFTInfo = {
        ...token,
        isNFT: true,
        metadata
      };
      
      if (isPartOfCollection && collectionId && collectionName) {
        // Add to collection
        nftInfo.collectionId = collectionId;
        nftInfo.collectionName = collectionName;
        
        if (!collections.has(collectionId)) {
          // Create new collection
          collections.set(collectionId, {
            id: collectionId,
            name: collectionName,
            nfts: []
          });
        }
        
        // Add NFT to collection
        const collection = collections.get(collectionId);
        if (collection) {
          collection.nfts.push(nftInfo);
        }
      } else {
        // Add as standalone NFT
        standaloneNfts.push(nftInfo);
      }
    } catch (error) {
      console.error(`Error processing token ${token.tokenId}:`, error);
      // Add to standalone if there was an error
      standaloneNfts.push({
        ...token,
        isNFT: true
      });
    }
  }
  
  return {
    collections: Array.from(collections.values()),
    standaloneNfts
  };
}

/**
 * Scans a wallet address for NFT collections
 * @param address Wallet address
 * @returns Collections found in the wallet
 */
export async function scanWalletForCollections(address: string): Promise<{
  collections: CollectionInfo[];
  standaloneNfts: NFTInfo[];
}> {
  try {
    // Get tokens for address
    const tokensResponse = await ergoPlatformApi.getAddressTokens(address);
    
    // Convert to TokenInfo objects
    const tokens: TokenInfo[] = tokensResponse.map((token: any) => ({
      tokenId: token.id,
      amount: BigInt(token.amount),
      name: token.name,
      decimals: token.decimals
    }));
    
    // Discover collections
    return await discoverCollections(tokens);
  } catch (error) {
    console.error(`Error scanning wallet ${address} for collections:`, error);
    return {
      collections: [],
      standaloneNfts: []
    };
  }
} 