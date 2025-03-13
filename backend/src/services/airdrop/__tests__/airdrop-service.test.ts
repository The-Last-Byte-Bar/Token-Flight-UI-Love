import { AirdropService, AirdropConfig } from '../airdrop-service';
import { transactionHistoryService, TransactionStatus } from '../transaction-history.service';
import * as transactionBuilder from '../../transaction/transaction-builder';
import * as walletConnector from '../../wallet/wallet-connector';

// Mock dependencies
jest.mock('../transaction-history.service');
jest.mock('../../transaction/transaction-builder');
jest.mock('../../wallet/wallet-connector');

// Test config
const mockConfig: AirdropConfig = {
  tokenDistributions: [
    { tokenId: 'token1', amount: 100, type: 'total' }
  ],
  nftDistributions: [
    { collectionId: 'collection1', nftIds: ['nft1', 'nft2'], type: 'random' }
  ],
  recipients: [
    { id: 'recipient1', address: 'addr1', name: 'User 1' },
    { id: 'recipient2', address: 'addr2', name: 'User 2' }
  ]
};

describe('AirdropService', () => {
  let airdropService: AirdropService;
  let originalWindow: any;
  
  beforeAll(() => {
    // Save original window
    originalWindow = global.window;
    
    // Mock window.ergo for all tests
    global.window = {
      ergo: {
        get_utxos: jest.fn().mockResolvedValue(['mock-utxo-1']),
      }
    } as any;
  });
  
  afterAll(() => {
    // Restore original window
    global.window = originalWindow;
  });
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock implementations
    (transactionHistoryService.createTransaction as jest.Mock).mockReturnValue('mock-tx-id-123');
    (transactionBuilder.buildBatchDistributionTx as jest.Mock).mockReturnValue({
      txId: 'mock-batch-tx-id',
      unsignedTx: { id: 'unsigned-batch-tx' }
    });
    (walletConnector.submitTransaction as jest.Mock).mockResolvedValue('mock-submitted-tx-id');
    
    // Create instance
    airdropService = new AirdropService();
  });
  
  describe('validateAirdropConfig', () => {
    it('should validate a valid config', () => {
      const result = airdropService.validateAirdropConfig(mockConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
    
    it('should reject a config with no recipients', () => {
      const invalidConfig = {
        ...mockConfig,
        recipients: []
      };
      
      const result = airdropService.validateAirdropConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('recipients'));
    });
    
    it('should reject a config with no distributions', () => {
      const invalidConfig = {
        ...mockConfig,
        tokenDistributions: [],
        nftDistributions: []
      };
      
      const result = airdropService.validateAirdropConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('distributions'));
    });
  });
});