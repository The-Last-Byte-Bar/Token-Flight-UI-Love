import { previewGeneratorService, AirdropPreview } from '../preview-generator.service';
import { AirdropConfig } from '../airdrop-service';

describe('PreviewGeneratorService', () => {
  // Mock airdrop config with various distribution types
  const mockComplexConfig: AirdropConfig = {
    tokenDistributions: [
      { tokenId: 'token1', amount: 100, type: 'total' },
      { tokenId: 'token2', amount: 50, type: 'per-user' }
    ],
    nftDistributions: [
      { collectionId: 'collection1', nftIds: ['nft1', 'nft2', 'nft3'], type: '1-to-1' },
      { collectionId: 'collection2', nftIds: ['nft4', 'nft5'], type: 'random' }
    ],
    recipients: [
      { id: 'recipient1', address: 'addr1', name: 'User 1' },
      { id: 'recipient2', address: 'addr2', name: 'User 2' },
      { id: 'recipient3', address: 'addr3', name: 'User 3' }
    ]
  };

  // Mock token metadata
  const mockTokenMetadata: { [tokenId: string]: { name: string; decimals: number } } = {
    'token1': { name: 'Token One', decimals: 2 },
    'token2': { name: 'Token Two', decimals: 0 }
  };

  describe('generatePreview', () => {
    it('should generate preview for a complex airdrop configuration', () => {
      const preview = previewGeneratorService.generatePreview(mockComplexConfig, mockTokenMetadata);
      
      // Verify top-level properties
      expect(preview.totalRecipients).toBe(3);
      expect(preview.totalDistributionsCount).toBeGreaterThan(0);
      expect(preview.tokenCounts).toBeDefined();
      expect(preview.nftCounts).toBeDefined();
      expect(preview.estimatedFee).toBeDefined();
      expect(preview.estimatedFeeInErg).toBeGreaterThan(0);
      
      // Verify token distributions
      expect(preview.tokenDistributions.length).toBeGreaterThan(0);
      
      // Verify token metadata integration
      const token1Dists = preview.tokenDistributions.filter(d => d.tokenId === 'token1');
      expect(token1Dists.length).toBe(3); // One for each recipient
      
      const firstToken1Dist = token1Dists[0];
      expect(firstToken1Dist.tokenName).toBe('Token One');
      expect(firstToken1Dist.decimals).toBe(2);
      expect(parseFloat(firstToken1Dist.amount)).toBeCloseTo(33.33, 0); // 100 / 3 approx
      
      const token2Dists = preview.tokenDistributions.filter(d => d.tokenId === 'token2');
      expect(token2Dists.length).toBe(3); // One for each recipient
      
      const firstToken2Dist = token2Dists[0];
      expect(firstToken2Dist.tokenName).toBe('Token Two');
      expect(firstToken2Dist.decimals).toBe(0);
      expect(firstToken2Dist.amount).toBe('50'); // per-user distribution
      
      // Verify NFT distributions
      expect(preview.nftDistributions.length).toBeGreaterThan(0);
      
      const collection1Dists = preview.nftDistributions.filter(d => d.collectionId === 'collection1');
      expect(collection1Dists.length).toBe(3); // 1-to-1 mapping for 3 NFTs and 3 recipients
      
      const collection2Dists = preview.nftDistributions.filter(d => d.collectionId === 'collection2');
      expect(collection2Dists.length).toBe(2); // Random mapping for 2 NFTs
    });
    
    it('should handle empty configurations', () => {
      const emptyConfig: AirdropConfig = {
        tokenDistributions: [],
        nftDistributions: [],
        recipients: []
      };
      
      const preview = previewGeneratorService.generatePreview(emptyConfig);
      
      expect(preview.totalRecipients).toBe(0);
      expect(preview.totalDistributionsCount).toBe(0);
      expect(preview.tokenDistributions.length).toBe(0);
      expect(preview.nftDistributions.length).toBe(0);
    });
    
    it('should handle configuration with only tokens', () => {
      const tokensOnlyConfig: AirdropConfig = {
        tokenDistributions: [
          { tokenId: 'token1', amount: 100, type: 'total' }
        ],
        nftDistributions: [],
        recipients: [
          { id: 'recipient1', address: 'addr1', name: 'User 1' },
          { id: 'recipient2', address: 'addr2', name: 'User 2' }
        ]
      };
      
      const preview = previewGeneratorService.generatePreview(tokensOnlyConfig, mockTokenMetadata);
      
      expect(preview.totalRecipients).toBe(2);
      expect(preview.tokenDistributions.length).toBe(2); // One token distribution per recipient
      expect(preview.nftDistributions.length).toBe(0);
      
      // Verify token distributions
      const token1Dists = preview.tokenDistributions.filter(d => d.tokenId === 'token1');
      expect(token1Dists.length).toBe(2); // One for each recipient
      
      const firstRecipientDist = token1Dists.find(d => d.address === 'addr1');
      expect(firstRecipientDist).toBeDefined();
      expect(parseFloat(firstRecipientDist!.amount)).toBeCloseTo(50, 0); // 100 / 2 = 50
    });
    
    it('should handle configuration with only NFTs', () => {
      const nftsOnlyConfig: AirdropConfig = {
        tokenDistributions: [],
        nftDistributions: [
          { collectionId: 'collection1', nftIds: ['nft1', 'nft2'], type: 'random' }
        ],
        recipients: [
          { id: 'recipient1', address: 'addr1', name: 'User 1' },
          { id: 'recipient2', address: 'addr2', name: 'User 2' }
        ]
      };
      
      const preview = previewGeneratorService.generatePreview(nftsOnlyConfig);
      
      expect(preview.totalRecipients).toBe(2);
      expect(preview.tokenDistributions.length).toBe(0);
      expect(preview.nftDistributions.length).toBe(2); // Two NFTs distributed
      
      // Count NFTs by collection
      expect(preview.nftCounts['collection1']).toBe(2);
    });
    
    it('should handle 1-to-1 NFT distributions correctly', () => {
      const oneToOneConfig: AirdropConfig = {
        tokenDistributions: [],
        nftDistributions: [
          { collectionId: 'collection1', nftIds: ['nft1', 'nft2', 'nft3'], type: '1-to-1' }
        ],
        recipients: [
          { id: 'recipient1', address: 'addr1', name: 'User 1' },
          { id: 'recipient2', address: 'addr2', name: 'User 2' },
          { id: 'recipient3', address: 'addr3', name: 'User 3' }
        ]
      };
      
      const preview = previewGeneratorService.generatePreview(oneToOneConfig);
      
      // Should have 3 NFT distributions (one per recipient)
      expect(preview.nftDistributions.length).toBe(3);
      
      // Verify each recipient gets a different NFT
      const nftIds = preview.nftDistributions.map(d => d.nftId);
      expect(new Set(nftIds).size).toBe(3); // All NFTs should be unique
      
      // Each address should appear exactly once
      const addresses = preview.nftDistributions.map(d => d.address);
      expect(new Set(addresses).size).toBe(3);
      expect(addresses).toContain('addr1');
      expect(addresses).toContain('addr2');
      expect(addresses).toContain('addr3');
    });
  });
}); 