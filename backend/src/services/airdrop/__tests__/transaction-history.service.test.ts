import { transactionHistoryService, TransactionStatus } from '../transaction-history.service';
import { transactionDb } from '../../../db/transaction-db';

// Mock the database
jest.mock('../../../db/transaction-db', () => ({
  transactionDb: {
    saveTransaction: jest.fn().mockResolvedValue(undefined),
    saveProgress: jest.fn().mockResolvedValue(undefined),
    getTransaction: jest.fn().mockResolvedValue(undefined),
    getProgress: jest.fn().mockResolvedValue(undefined),
    getTransactionsForAddress: jest.fn().mockResolvedValue([]),
    deleteTransaction: jest.fn().mockResolvedValue(true)
  }
}));

describe('TransactionHistoryService', () => {
  // Reset the transaction history before each test
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Clear the transaction history
    transactionHistoryService.clearHistory();
    
    // Disable database for testing - we just want to test in-memory operations
    transactionHistoryService.setDbEnabled(false);
  });

  // Mock airdrop config
  const mockConfig = {
    tokenDistributions: [
      { tokenId: 'token1', amount: 100, type: 'total' as const }
    ],
    nftDistributions: [
      { collectionId: 'collection1', nftIds: ['nft1', 'nft2'], type: '1-to-1' as const }
    ],
    recipients: [
      { id: 'recipient1', address: 'addr1', name: 'User 1' },
      { id: 'recipient2', address: 'addr2', name: 'User 2' }
    ]
  };

  describe('createTransaction', () => {
    it('should create a transaction record with the correct data', async () => {
      const txId = 'testTxId';
      const senderAddress = 'testSenderAddress';
      
      const recordId = transactionHistoryService.createTransaction(txId, senderAddress, mockConfig);
      
      // Verify the record was created with expected ID format
      expect(recordId).toMatch(/^tx_\d+_[a-z0-9]+$/);
      
      // Verify the transaction record
      const record = await transactionHistoryService.getTransaction(recordId);
      expect(record).toBeDefined();
      expect(record?.txId).toBe(txId);
      expect(record?.senderAddress).toBe(senderAddress);
      expect(record?.status).toBe(TransactionStatus.PENDING);
      expect(record?.config).toEqual(mockConfig);
      
      // Verify progress initialization
      const progress = await transactionHistoryService.getTransactionProgress(recordId);
      expect(progress).toBeDefined();
      expect(progress?.totalDistributions).toBe(3); // 1 token + 2 NFTs
      expect(progress?.completedDistributions).toBe(0);
      expect(progress?.percentComplete).toBe(0);
      expect(progress?.transactionIds).toEqual([txId]);
    });
  });

  describe('getTransactionsForAddress', () => {
    it('should return transactions for a specific address', async () => {
      const address1 = 'address1';
      const address2 = 'address2';
      
      // Create transactions from different addresses
      const recordId1 = transactionHistoryService.createTransaction('tx1', address1, mockConfig);
      const recordId2 = transactionHistoryService.createTransaction('tx2', address1, mockConfig);
      const recordId3 = transactionHistoryService.createTransaction('tx3', address2, mockConfig);
      
      // Get transactions for address1
      const transactions = await transactionHistoryService.getTransactionsForAddress(address1);
      
      // Verify we get only transactions from address1
      expect(transactions.length).toBe(2);
      expect(transactions.find(tx => tx.id === recordId1)).toBeDefined();
      expect(transactions.find(tx => tx.id === recordId2)).toBeDefined();
      expect(transactions.find(tx => tx.id === recordId3)).toBeUndefined();
      
      // Verify sorting (newest first)
      expect(transactions[0].timestamp).toBeGreaterThanOrEqual(transactions[1].timestamp);
    });
    
    it('should return an empty array if no transactions for address', async () => {
      const transactions = await transactionHistoryService.getTransactionsForAddress('nonexistent');
      expect(transactions).toEqual([]);
    });
  });

  describe('updateTransactionStatus', () => {
    it('should update transaction status', async () => {
      const recordId = transactionHistoryService.createTransaction('tx1', 'addr1', mockConfig);
      
      // Update to confirmed
      const updatedRecord = transactionHistoryService.updateTransactionStatus(
        recordId, 
        TransactionStatus.CONFIRMED
      );
      
      // Verify status update
      expect(updatedRecord?.status).toBe(TransactionStatus.CONFIRMED);
      expect(updatedRecord?.confirmedAt).toBeDefined();
      
      // Verify record in storage is updated
      const retrievedRecord = await transactionHistoryService.getTransaction(recordId);
      expect(retrievedRecord?.status).toBe(TransactionStatus.CONFIRMED);
    });
    
    it('should update transaction status with failure reason', async () => {
      const recordId = transactionHistoryService.createTransaction('tx1', 'addr1', mockConfig);
      const failureReason = 'Not enough funds';
      
      // Update to failed with reason
      const updatedRecord = transactionHistoryService.updateTransactionStatus(
        recordId, 
        TransactionStatus.FAILED,
        { failureReason }
      );
      
      // Verify status and reason
      expect(updatedRecord?.status).toBe(TransactionStatus.FAILED);
      expect(updatedRecord?.failureReason).toBe(failureReason);
    });
    
    it('should return undefined for non-existent transaction', async () => {
      const result = transactionHistoryService.updateTransactionStatus(
        'non-existent', 
        TransactionStatus.CONFIRMED
      );
      expect(result).toBeUndefined();
    });
  });

  describe('updateTransactionProgress', () => {
    it('should update progress information', async () => {
      const recordId = transactionHistoryService.createTransaction('tx1', 'addr1', mockConfig);
      
      // Update progress
      const updatedProgress = transactionHistoryService.updateTransactionProgress(
        recordId,
        {
          completedDistributions: 2,
          currentTokenId: 'token1',
          currentDistributionType: 'total',
          additionalTxId: 'tx2'
        }
      );
      
      // Verify progress update
      expect(updatedProgress?.completedDistributions).toBe(2);
      expect(updatedProgress?.percentComplete).toBe(67); // 2/3 * 100 rounded
      expect(updatedProgress?.currentTokenId).toBe('token1');
      expect(updatedProgress?.currentDistributionType).toBe('total');
      expect(updatedProgress?.transactionIds).toContain('tx1');
      expect(updatedProgress?.transactionIds).toContain('tx2');
    });
    
    it('should return undefined for non-existent transaction', async () => {
      const result = transactionHistoryService.updateTransactionProgress(
        'non-existent',
        { completedDistributions: 1 }
      );
      expect(result).toBeUndefined();
    });
  });

  describe('clearHistory', () => {
    it('should clear all transaction history', async () => {
      // Create several transactions
      const recordId1 = transactionHistoryService.createTransaction('tx1', 'addr1', mockConfig);
      const recordId2 = transactionHistoryService.createTransaction('tx2', 'addr2', mockConfig);
      
      // Verify transactions exist
      expect(await transactionHistoryService.getTransaction(recordId1)).toBeDefined();
      expect(await transactionHistoryService.getTransaction(recordId2)).toBeDefined();
      
      // Clear history
      await transactionHistoryService.clearHistory();
      
      // Verify transactions are gone
      expect(await transactionHistoryService.getTransaction(recordId1)).toBeUndefined();
      expect(await transactionHistoryService.getTransaction(recordId2)).toBeUndefined();
      expect(await transactionHistoryService.getTransactionProgress(recordId1)).toBeUndefined();
      expect(await transactionHistoryService.getTransactionProgress(recordId2)).toBeUndefined();
    });
  });
});