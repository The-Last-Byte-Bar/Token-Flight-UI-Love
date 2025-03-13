import { 
  WebSocketService, 
  WebSocketEventType,
  WebSocketMessage, 
  websocketService
} from '../websocket-service';
import { TransactionStatus } from '../../airdrop/transaction-history.service';

// Mock transaction data
const mockTransaction = {
  id: 'tx-123',
  txId: 'blockchain-tx-id',
  status: TransactionStatus.PENDING,
  timestamp: Date.now(),
  senderAddress: 'sender-address',
  config: {
    tokenDistributions: [],
    nftDistributions: [],
    recipients: []
  }
};

const mockProgress = {
  totalDistributions: 5,
  completedDistributions: 2,
  percentComplete: 40,
  transactionIds: ['tx-123']
};

describe('WebSocketService', () => {
  let service: WebSocketService;

  beforeEach(() => {
    // Create a new instance for each test
    service = new WebSocketService();
  });

  afterEach(() => {
    // Clean up after each test
    service.close();
  });

  it('should export singleton websocketService', () => {
    expect(websocketService).toBeInstanceOf(WebSocketService);
  });

  describe('notifyTransactionCreated', () => {
    it('should be defined', () => {
      expect(service.notifyTransactionCreated).toBeDefined();
    });

    it('should be callable with transaction data', () => {
      // This is a simple test that just ensures the method doesn't throw
      expect(() => {
        service.notifyTransactionCreated(mockTransaction);
      }).not.toThrow();
    });
  });

  describe('notifyTransactionUpdated', () => {
    it('should be defined', () => {
      expect(service.notifyTransactionUpdated).toBeDefined();
    });

    it('should be callable with transaction data', () => {
      // This is a simple test that just ensures the method doesn't throw
      expect(() => {
        service.notifyTransactionUpdated(mockTransaction);
      }).not.toThrow();
    });

    it('should handle CONFIRMED status', () => {
      // Create a confirmed transaction
      const confirmedTransaction = {
        ...mockTransaction,
        status: TransactionStatus.CONFIRMED
      };

      // This is a simple test that just ensures the method doesn't throw
      expect(() => {
        service.notifyTransactionUpdated(confirmedTransaction);
      }).not.toThrow();
    });

    it('should handle FAILED status', () => {
      // Create a failed transaction
      const failedTransaction = {
        ...mockTransaction,
        status: TransactionStatus.FAILED
      };

      // This is a simple test that just ensures the method doesn't throw
      expect(() => {
        service.notifyTransactionUpdated(failedTransaction);
      }).not.toThrow();
    });
  });

  describe('notifyTransactionProgress', () => {
    it('should be defined', () => {
      expect(service.notifyTransactionProgress).toBeDefined();
    });

    it('should be callable with transaction progress data', () => {
      // This is a simple test that just ensures the method doesn't throw
      expect(() => {
        service.notifyTransactionProgress(
          'tx-123',
          'sender-address',
          mockProgress
        );
      }).not.toThrow();
    });
  });

  // Test initialization and close methods
  describe('initialize and close', () => {
    it('should have initialize method', () => {
      expect(service.initialize).toBeDefined();
    });

    it('should have close method', () => {
      expect(service.close).toBeDefined();
    });

    it('should not throw when calling close multiple times', () => {
      expect(() => {
        service.close();
        service.close();
      }).not.toThrow();
    });
  });
}); 