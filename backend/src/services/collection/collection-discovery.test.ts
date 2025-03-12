import { discoverCollections } from './collection-discovery';
import ergoPlatformApi from '../api/ergo-platform-api';

// Mock the Ergo Platform API
jest.mock('../api/ergo-platform-api', () => ({
  getBoxByTokenId: jest.fn()
}));

describe('Collection Discovery Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should identify NFTs with collection info', async () => {
    // Setup mock responses
    const mockBoxData = {
      additionalRegisters: {
        R4: '0e0f436f6c6c656374696f6e3a54657374', // "Collection:Test" encoded
        R5: '0e104e4654204465736372697074696f6e', // "NFT Description" encoded
        R6: '0e1868747470733a2f2f6578616d706c652e636f6d2f696d6167652e706e67' // URL encoded
      }
    };

    (ergoPlatformApi.getBoxByTokenId as jest.Mock).mockResolvedValue(mockBoxData);

    // Test tokens
    const tokens = [
      {
        tokenId: 'token1',
        amount: BigInt(1),
        name: 'Test NFT 1',
        decimals: 0
      },
      {
        tokenId: 'token2',
        amount: BigInt(1),
        name: 'Test NFT 2',
        decimals: 0
      },
      {
        tokenId: 'token3',
        amount: BigInt(100),
        name: 'Regular Token',
        decimals: 2
      }
    ];

    // Call the function
    const result = await discoverCollections(tokens);

    // Assertions
    expect(result.collections.length).toBe(1);
    expect(result.collections[0].name).toBe('Test');
    expect(result.collections[0].nfts.length).toBe(2);
    expect(result.standaloneNfts.length).toBe(0);
    
    // API should be called only for NFTs (amount = 1)
    expect(ergoPlatformApi.getBoxByTokenId).toHaveBeenCalledTimes(2);
  });

  it('should handle NFTs without collection info', async () => {
    // Setup mock response without collection info
    const mockBoxData = {
      additionalRegisters: {
        R4: '0e0a4a757374204e4654', // "Just NFT" encoded
        R5: '0e104e4654204465736372697074696f6e' // "NFT Description" encoded
      }
    };

    (ergoPlatformApi.getBoxByTokenId as jest.Mock).mockResolvedValue(mockBoxData);

    // Test tokens
    const tokens = [
      {
        tokenId: 'token1',
        amount: BigInt(1),
        name: 'Standalone NFT',
        decimals: 0
      }
    ];

    // Call the function
    const result = await discoverCollections(tokens);

    // Assertions
    expect(result.collections.length).toBe(0);
    expect(result.standaloneNfts.length).toBe(1);
    expect(result.standaloneNfts[0].tokenId).toBe('token1');
  });

  it('should handle API errors gracefully', async () => {
    // Setup mock to throw error
    (ergoPlatformApi.getBoxByTokenId as jest.Mock).mockRejectedValue(new Error('API Error'));

    // Test tokens
    const tokens = [
      {
        tokenId: 'token1',
        amount: BigInt(1),
        name: 'Error NFT',
        decimals: 0
      }
    ];

    // Call the function
    const result = await discoverCollections(tokens);

    // Assertions
    expect(result.collections.length).toBe(0);
    expect(result.standaloneNfts.length).toBe(1);
    expect(result.standaloneNfts[0].tokenId).toBe('token1');
  });
}); 