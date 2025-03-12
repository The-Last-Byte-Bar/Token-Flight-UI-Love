# NFT Collection Identification Process

## Overview

The Deep Sea Airdrop platform identifies NFT collections from a user's wallet through a systematic process that leverages the Ergo blockchain's box model and additional metadata stored in transaction outputs. This document explains how collections are discovered, identified, and organized for the user interface.

## Process Flow

### 1. Initial Wallet Scanning

When a user connects their Nautilus wallet, the application:
- Retrieves a list of all tokens owned by the wallet
- Filters to identify potential NFTs (typically tokens with quantity of 1)
- Creates a list of token IDs for further investigation

### 2. Box Data Retrieval

For each potential NFT token ID, the application:
- Queries the Ergo Platform API using the endpoint: `https://api.ergoplatform.com/api/v1/boxes/{tokenId}`
- Receives detailed box data that contains the token's metadata
- Box data includes additional registers (R4-R9) that may contain collection information

### 3. Metadata Extraction and Parsing

The application parses the box data to extract relevant metadata:
- R4-R9 registers may contain encoded information about the token
- Collection information is typically stored in specific registers following EIP-4 or similar standards
- Common metadata fields include:
  - Collection name/ID
  - Artist information
  - Creation date
  - Rarity information
  - Collection attributes

### 4. Collection Identification Logic

The application uses several indicators to identify collections:

#### Collection Identifiers
- Explicit collection name in metadata
- Shared prefix in NFT names
- Common collection ID in metadata
- Same issuer address
- Similar metadata structure

#### Additional Verification
- Cross-referencing with known collection databases
- Looking for collection standards compliance
- Verifying authenticity markers

### 5. Collection Organization

After identification, the application:
- Groups NFTs belonging to the same collection
- Creates collection objects with:
  - Collection name
  - Collection description (if available)
  - Array of member NFTs
  - Collection-level metadata
  - Distribution method (to be selected by user)
  - Selection status

### 6. Handling Special Cases

The application handles several special cases:

#### Standalone NFTs
- NFTs without collection information are categorized as "Standalone NFTs"
- These can still be selected for airdrops individually

#### Partial Collections
- If a user owns only some NFTs from a collection, the application still identifies them as part of that collection
- The UI indicates that these are part of a larger collection

#### Multiple Owned Collections
- Users who own multiple complete collections have them displayed separately
- The UI allows batch operations on entire collections

## Technical Implementation

### API Integration
The core of the collection identification revolves around proper parsing of the box data returned from the Ergo Platform API. Example API response structure:

```json
{
  "boxId": "43e8803ca559976ad631d69807311f5476daaa1271efcbdfb4695e5ee0d8856e",
  "transactionId": "9148408c04c2e38a6402a7950d6157730fa7d49e9ab3b9cadec481d7769918e7",
  "blockId": "9dae3b1512a62266c61d6842a964d4163dfa962e6f3ad5c1d1175a896184c2a3",
  "value": 1000000,
  "index": 0,
  "creationHeight": 826142,
  "ergoTree": "0008cd03c29db9b4b986a3c7..."
  "assets": [
    {
      "tokenId": "43e8803ca559976ad631d69807311f5476daaa1271efcbdfb4695e5ee0d8856e",
      "amount": 1
    }
  ],
  "additionalRegisters": {
    "R4": "0e0f436f6c6c656374696f6e4e616d65",
    "R5": "0e104e46542344657363726970...",
    "R6": "0e1868747470733a2f2f697066732e696f2f697066732f516d..."
  },
  "spentTransactionId": null,
  "mainChain": true
}
```

### Metadata Extraction Function
The application uses a dedicated function to parse the box data and extract collection information:

```javascript
function extractCollectionInfo(boxData) {
  const registers = boxData.additionalRegisters;
  
  // Decode register values from hex to readable format
  const decodedR4 = registers.R4 ? decodeRegister(registers.R4) : null;
  const decodedR5 = registers.R5 ? decodeRegister(registers.R5) : null;
  
  // Look for collection identifiers
  let collectionInfo = {
    id: null,
    name: null,
    isPartOfCollection: false
  };
  
  // Example: Check if R4 contains collection name
  if (decodedR4 && decodedR4.startsWith("Collection:")) {
    collectionInfo.name = decodedR4.substring(11);
    collectionInfo.isPartOfCollection = true;
  }
  
  // Further parsing logic...
  
  return collectionInfo;
}
```

### User Interface Representation

Once collections are identified, they are presented in the UI with:
- Collection thumbnails using representative NFT images
- Collection names and descriptions
- NFT count indicators
- Selection controls for both entire collections and individual NFTs
- Distribution method selectors per collection

## Performance Considerations

To optimize the collection identification process:
- API requests are batched when possible
- Collection data is cached to reduce repeated API calls
- Lazy loading is used for large collections
- Metadata parsing is performed in a background thread to prevent UI blocking