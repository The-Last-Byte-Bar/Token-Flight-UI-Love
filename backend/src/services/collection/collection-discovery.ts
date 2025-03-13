
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
  const assets = boxData.assets || [];
  
  // Initialize collection info
  const metadata: Record<string, any> = {};
  let collectionInfo = {
    collectionId: null as string | null,
    collectionName: null as string | null,
    isPartOfCollection: false,
    metadata
  };
  
  // Check for R7 register which often contains the collection ID
  if (registers.R7) {
    try {
      // Get the rendered or serialized value from R7
      const r7Value = registers.R7.renderedValue || registers.R7.serializedValue;
      
      if (r7Value) {
        // If it starts with 0e20, it's likely a Coll[Byte] with a token ID (remove prefix)
        const tokenId = r7Value.startsWith('0e20') ? r7Value.substring(4) : r7Value;
        
        console.log(`Found R7 register with value: ${tokenId}`);
        
        // Check if any asset's tokenId matches the R7 value
        // This indicates this token is part of a collection
        const matchingAsset = assets.find((asset: any) => asset.tokenId === tokenId);
        
        if (matchingAsset) {
          collectionInfo.collectionId = tokenId;
          collectionInfo.collectionName = matchingAsset.name || `Collection ${tokenId.substring(0, 8)}`;
          collectionInfo.isPartOfCollection = true;
          
          console.log(`Found NFT in collection: ${collectionInfo.collectionName} (${tokenId})`);
        }
      }
    } catch (error) {
      console.error('Error parsing R7 register:', error);
    }
  }
  
  // Decode other registers for additional metadata
  if (registers.R4) metadata.R4 = registers.R4.renderedValue || registers.R4.serializedValue;
  if (registers.R5) metadata.R5 = registers.R5.renderedValue || registers.R5.serializedValue;
  if (registers.R6) metadata.R6 = registers.R6.renderedValue || registers.R6.serializedValue;
  if (registers.R8) metadata.R8 = registers.R8.renderedValue || registers.R8.serializedValue;
  if (registers.R9) metadata.R9 = registers.R9.renderedValue || registers.R9.serializedValue;
  
  // If we haven't found a collection ID via R7, check old method (register values)
  if (!collectionInfo.isPartOfCollection) {
    // Decode register values from hex to readable format
    const decodedR4 = registers.R4 && registers.R4.renderedValue ? registers.R4.renderedValue : null;
    const decodedR5 = registers.R5 && registers.R5.renderedValue ? registers.R5.renderedValue : null;
    
    // Look for collection identifiers in R4 or R5
    if (decodedR4 && typeof decodedR4 === 'string' && decodedR4.includes('Collection:')) {
      const collectionParts = decodedR4.split('Collection:');
      if (collectionParts.length > 1) {
        collectionInfo.collectionName = collectionParts[1].trim();
        collectionInfo.isPartOfCollection = true;
        // Generate collection ID from name if we found it this way
        collectionInfo.collectionId = `collection_${Buffer.from(collectionInfo.collectionName).toString('hex')}`;
      }
    } else if (decodedR5 && typeof decodedR5 === 'string' && decodedR5.includes('Collection:')) {
      const collectionParts = decodedR5.split('Collection:');
      if (collectionParts.length > 1) {
        collectionInfo.collectionName = collectionParts[1].trim();
        collectionInfo.isPartOfCollection = true;
        // Generate collection ID from name if we found it this way
        collectionInfo.collectionId = `collection_${Buffer.from(collectionInfo.collectionName).toString('hex')}`;
      }
    }
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
  
  console.log(`Processing ${potentialNfts.length} potential NFTs for collection discovery...`);
  
  // Process each potential NFT
  for (const token of potentialNfts) {
    try {
      console.log(`Fetching box data for token: ${token.tokenId}`);
      const boxData = await ergoPlatformApi.getBoxByTokenId(token.tokenId);
      
      if (!boxData) {
        console.warn(`No box data found for token ${token.tokenId}, treating as standalone NFT`);
        standaloneNfts.push({
          ...token,
          isNFT: true,
          metadata: {}
        });
        continue;
      }
      
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
  
  const collectionsArray = Array.from(collections.values());
  console.log(`Discovered ${collectionsArray.length} collections containing ${collectionsArray.reduce((acc, curr) => acc + curr.nfts.length, 0)} NFTs`);
  console.log(`Found ${standaloneNfts.length} standalone NFTs`);
  
  return {
    collections: collectionsArray,
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
