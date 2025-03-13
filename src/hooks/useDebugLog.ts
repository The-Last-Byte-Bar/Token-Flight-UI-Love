
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
    console.log(`[${namespace}]`, value);
  }, dependencies);
}

/**
 * Utility function to log actions with a specific namespace
 * @param namespace The name of the component or context to prefix logs with
 * @returns A function that logs messages with the given namespace
 */
export function createDebugLogger(namespace: string) {
  return (message: string, data?: any) => {
    if (data) {
      console.log(`[${namespace}] ${message}`, data);
    } else {
      console.log(`[${namespace}] ${message}`);
    }
  };
}

export default useDebugLog;
