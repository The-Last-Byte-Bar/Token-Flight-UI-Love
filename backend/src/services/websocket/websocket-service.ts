import WebSocket from 'ws';
import http from 'http';
import { TransactionProgress, TransactionRecord, TransactionStatus } from '../airdrop/transaction-history.service';

/**
 * Event types for WebSocket messages
 */
export enum WebSocketEventType {
  TRANSACTION_CREATED = 'transaction_created',
  TRANSACTION_UPDATED = 'transaction_updated',
  TRANSACTION_PROGRESS = 'transaction_progress',
  TRANSACTION_COMPLETED = 'transaction_completed',
  TRANSACTION_FAILED = 'transaction_failed',
  CONNECTION_ESTABLISHED = 'connection_established'
}

/**
 * WebSocket message payload
 */
export interface WebSocketMessage {
  type: WebSocketEventType;
  data: any;
  timestamp: number;
}

/**
 * WebSocket client message
 */
interface ClientMessage {
  action: 'subscribe' | 'unsubscribe';
  address?: string;
  transactionId?: string;
}

/**
 * WebSocket service for real-time updates
 */
export class WebSocketService {
  private wss: WebSocket.Server | null = null;
  private clientsByAddress: Map<string, Set<WebSocket>> = new Map();
  private clientsByTxId: Map<string, Set<WebSocket>> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize the WebSocket server
   * @param server HTTP server to attach to
   */
  initialize(server: http.Server): void {
    if (this.wss) {
      console.warn('WebSocket server already initialized');
      return;
    }

    this.wss = new WebSocket.Server({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      // Handle new connection
      console.log('WebSocket connection established');

      // Send welcome message
      this.sendToClient(ws, {
        type: WebSocketEventType.CONNECTION_ESTABLISHED,
        data: { message: 'WebSocket connection established' },
        timestamp: Date.now()
      });

      // Handle messages from client
      ws.on('message', (message: WebSocket.RawData) => {
        try {
          const parsed = JSON.parse(message.toString()) as ClientMessage;
          this.handleClientMessage(ws, parsed);
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.handleClientDisconnect(ws);
      });
    });

    // Set up ping interval to keep connections alive
    this.pingInterval = setInterval(() => {
      this.wss?.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.ping();
        }
      });
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Send a message to a specific client
   * @param client WebSocket client
   * @param message Message to send
   */
  private sendToClient(client: WebSocket, message: WebSocketMessage): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  /**
   * Handle messages from client
   * @param client WebSocket client
   * @param message Message from client
   */
  private handleClientMessage(client: WebSocket, message: ClientMessage): void {
    // Handle subscription requests
    if (message.action === 'subscribe') {
      if (message.address) {
        this.subscribeToAddress(client, message.address);
      }
      if (message.transactionId) {
        this.subscribeToTransaction(client, message.transactionId);
      }
    } else if (message.action === 'unsubscribe') {
      if (message.address) {
        this.unsubscribeFromAddress(client, message.address);
      }
      if (message.transactionId) {
        this.unsubscribeFromTransaction(client, message.transactionId);
      }
    }
  }

  /**
   * Handle client disconnect
   * @param client WebSocket client
   */
  private handleClientDisconnect(client: WebSocket): void {
    // Remove client from all subscriptions
    this.clientsByAddress.forEach((clients, address) => {
      clients.delete(client);
      if (clients.size === 0) {
        this.clientsByAddress.delete(address);
      }
    });

    this.clientsByTxId.forEach((clients, txId) => {
      clients.delete(client);
      if (clients.size === 0) {
        this.clientsByTxId.delete(txId);
      }
    });
  }

  /**
   * Subscribe a client to transactions for an address
   * @param client WebSocket client
   * @param address Address to subscribe to
   */
  private subscribeToAddress(client: WebSocket, address: string): void {
    if (!this.clientsByAddress.has(address)) {
      this.clientsByAddress.set(address, new Set());
    }
    this.clientsByAddress.get(address)?.add(client);
  }

  /**
   * Unsubscribe a client from transactions for an address
   * @param client WebSocket client
   * @param address Address to unsubscribe from
   */
  private unsubscribeFromAddress(client: WebSocket, address: string): void {
    const clients = this.clientsByAddress.get(address);
    if (clients) {
      clients.delete(client);
      if (clients.size === 0) {
        this.clientsByAddress.delete(address);
      }
    }
  }

  /**
   * Subscribe a client to updates for a transaction
   * @param client WebSocket client
   * @param txId Transaction ID
   */
  private subscribeToTransaction(client: WebSocket, txId: string): void {
    if (!this.clientsByTxId.has(txId)) {
      this.clientsByTxId.set(txId, new Set());
    }
    this.clientsByTxId.get(txId)?.add(client);
  }

  /**
   * Unsubscribe a client from updates for a transaction
   * @param client WebSocket client
   * @param txId Transaction ID
   */
  private unsubscribeFromTransaction(client: WebSocket, txId: string): void {
    const clients = this.clientsByTxId.get(txId);
    if (clients) {
      clients.delete(client);
      if (clients.size === 0) {
        this.clientsByTxId.delete(txId);
      }
    }
  }

  /**
   * Notify about transaction creation
   * @param transaction Transaction record
   */
  notifyTransactionCreated(transaction: TransactionRecord): void {
    const message: WebSocketMessage = {
      type: WebSocketEventType.TRANSACTION_CREATED,
      data: transaction,
      timestamp: Date.now()
    };

    // Notify clients subscribed to the address
    this.notifyAddressSubscribers(transaction.senderAddress, message);
    // Notify clients subscribed to the transaction
    this.notifyTransactionSubscribers(transaction.id, message);
  }

  /**
   * Notify about transaction status update
   * @param transaction Transaction record
   */
  notifyTransactionUpdated(transaction: TransactionRecord): void {
    const message: WebSocketMessage = {
      type: WebSocketEventType.TRANSACTION_UPDATED,
      data: transaction,
      timestamp: Date.now()
    };

    // Notify clients subscribed to the address
    this.notifyAddressSubscribers(transaction.senderAddress, message);
    // Notify clients subscribed to the transaction
    this.notifyTransactionSubscribers(transaction.id, message);

    // Special notifications for completed or failed transactions
    if (transaction.status === TransactionStatus.CONFIRMED) {
      this.notifyTransactionCompleted(transaction);
    } else if (transaction.status === TransactionStatus.FAILED) {
      this.notifyTransactionFailed(transaction);
    }
  }

  /**
   * Notify about transaction progress update
   * @param txId Transaction ID
   * @param senderAddress Sender address
   * @param progress Progress information
   */
  notifyTransactionProgress(txId: string, senderAddress: string, progress: TransactionProgress): void {
    const message: WebSocketMessage = {
      type: WebSocketEventType.TRANSACTION_PROGRESS,
      data: { txId, progress },
      timestamp: Date.now()
    };

    // Notify clients subscribed to the address
    this.notifyAddressSubscribers(senderAddress, message);
    // Notify clients subscribed to the transaction
    this.notifyTransactionSubscribers(txId, message);
  }

  /**
   * Notify about transaction completion
   * @param transaction Transaction record
   */
  private notifyTransactionCompleted(transaction: TransactionRecord): void {
    const message: WebSocketMessage = {
      type: WebSocketEventType.TRANSACTION_COMPLETED,
      data: transaction,
      timestamp: Date.now()
    };

    // Notify clients subscribed to the address
    this.notifyAddressSubscribers(transaction.senderAddress, message);
    // Notify clients subscribed to the transaction
    this.notifyTransactionSubscribers(transaction.id, message);
  }

  /**
   * Notify about transaction failure
   * @param transaction Transaction record
   */
  private notifyTransactionFailed(transaction: TransactionRecord): void {
    const message: WebSocketMessage = {
      type: WebSocketEventType.TRANSACTION_FAILED,
      data: transaction,
      timestamp: Date.now()
    };

    // Notify clients subscribed to the address
    this.notifyAddressSubscribers(transaction.senderAddress, message);
    // Notify clients subscribed to the transaction
    this.notifyTransactionSubscribers(transaction.id, message);
  }

  /**
   * Notify all clients subscribed to an address
   * @param address Address
   * @param message Message to send
   */
  private notifyAddressSubscribers(address: string, message: WebSocketMessage): void {
    const clients = this.clientsByAddress.get(address);
    if (clients) {
      clients.forEach(client => {
        this.sendToClient(client, message);
      });
    }
  }

  /**
   * Notify all clients subscribed to a transaction
   * @param txId Transaction ID
   * @param message Message to send
   */
  private notifyTransactionSubscribers(txId: string, message: WebSocketMessage): void {
    const clients = this.clientsByTxId.get(txId);
    if (clients) {
      clients.forEach(client => {
        this.sendToClient(client, message);
      });
    }
  }

  /**
   * Close the WebSocket server
   */
  close(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    this.clientsByAddress.clear();
    this.clientsByTxId.clear();
  }
}

// Export singleton instance
export const websocketService = new WebSocketService(); 