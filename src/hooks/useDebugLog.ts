
import { useEffect } from 'react';

/**
 * Utility hook to log state changes with a namespace
 * @param namespace The name of the component or context to prefix logs with
 * @param value The value to log when it changes
 * @param dependencies Array of dependencies that should trigger a log when changed
 */
export function useDebugLog(
  namespace: string, 
  value: any, 
  dependencies: any[] = []
) {
  useEffect(() => {
    // Safely log values, handling undefined or circular references
    try {
      console.log(`[${namespace}]`, value);
    } catch (e) {
      console.log(`[${namespace}] Error logging value:`, e);
    }
  }, dependencies);
}

/**
 * Utility function to log actions with a specific namespace
 * @param namespace The name of the component or context to prefix logs with
 * @returns A function that logs messages with the given namespace
 */
export function createDebugLogger(namespace: string) {
  return (message: string, data?: any) => {
    try {
      if (data !== undefined) {
        console.log(`[${namespace}] ${message}`, data);
      } else {
        console.log(`[${namespace}] ${message}`);
      }
    } catch (e) {
      console.log(`[${namespace}] Error logging message "${message}":`, e);
    }
  };
}

/**
 * Force the browser to flush all pending logs to the console
 * Useful when debugging async operations that might not complete
 */
export function flushLogs() {
  console.log('---------- LOG CHECKPOINT ----------');
}

export default useDebugLog;
