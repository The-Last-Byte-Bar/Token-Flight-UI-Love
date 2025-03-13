/**
 * Global type declarations for missing types
 */

/**
 * Provides the missing ErrorOptions type needed by @fleet-sdk/common
 * This fixes the TypeScript compilation error during Docker build
 */
declare interface ErrorOptions {
  cause?: unknown;
  [key: string]: any;
}

/**
 * Type declarations for browser-specific objects used in the wallet connector
 * These are needed for TypeScript compilation in a Node.js environment
 */
interface Window {
  ergoConnector?: any;
  ergo?: any;
}

// This is a workaround for TypeScript in a Node.js environment
// It allows the code to compile even though these browser objects don't exist at runtime
declare global {
  interface Window {
    ergoConnector?: any;
    ergo?: any;
  }
} 