// Mock window object for Nautilus wallet
global.window = {
  ergoConnector: {
    nautilus: {
      connect: jest.fn().mockResolvedValue(true),
      isConnected: jest.fn().mockResolvedValue(true),
      getContext: jest.fn().mockResolvedValue({})
    }
  },
  ergo: {
    get_used_addresses: jest.fn().mockResolvedValue(['testAddress1', 'testAddress2']),
    get_change_address: jest.fn().mockResolvedValue('testChangeAddress'),
    get_utxos: jest.fn().mockResolvedValue([
      {
        boxId: 'box1',
        value: 1000000000n,
        creationHeight: 100,
        assets: [
          { tokenId: 'token1', amount: 100n },
          { tokenId: 'token2', amount: 200n }
        ]
      }
    ]),
    get_current_height: jest.fn().mockResolvedValue(100),
    sign_tx: jest.fn().mockResolvedValue('signedTx'),
    submit_tx: jest.fn().mockResolvedValue('txId123')
  }
} as any;

// Override console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

// Silence console in tests unless explicitly requested not to
beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
}); 