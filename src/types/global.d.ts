// Global type definitions for Nautilus wallet

declare global {
  interface Window {
    ergo?: {
      get_used_addresses: () => Promise<string[]>;
      get_change_address: () => Promise<string>;
      get_balance: () => Promise<{ confirmed: string; unconfirmed: string; tokens: any[] }>;
      get_utxos: () => Promise<any[]>;
      sign_tx: (tx: any) => Promise<any>;
      submit_tx: (tx: any) => Promise<any>;
    };
  }
}

export {}; 