declare global {
  interface Window {
    ergoConnector: {
      nautilus: {
        connect: (options: { createErgoObject: boolean }) => Promise<boolean>;
        isConnected: () => Promise<boolean>;
        getContext: () => Promise<any>;
      };
    };
    ergo: {
      get_used_addresses: () => Promise<string[]>;
      get_change_address: () => Promise<string>;
      get_utxos: () => Promise<any[]>;
      get_current_height: () => Promise<number>;
      sign_tx: (unsignedTx: any) => Promise<any>;
      submit_tx: (signedTx: any) => Promise<string>;
    };
  }
}

export {}; 