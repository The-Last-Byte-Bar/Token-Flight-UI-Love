import axios, { AxiosInstance } from 'axios';
import { env } from '../../config/env';

class MiningPoolApi {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: env.miningPoolApiUrl,
      timeout: 10000
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          console.error(
            `Mining Pool API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
          );
        } else if (error.request) {
          console.error('Mining Pool API Error: No response received', error.request);
        } else {
          console.error('Mining Pool API Error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get miners data from the pool
   * @returns List of miners
   */
  async getMiners() {
    try {
      const response = await this.client.get('/miners');
      return response.data;
    } catch (error) {
      console.error('Failed to get miners data', error);
      throw error;
    }
  }

  /**
   * Get miner addresses for airdrop
   * @param options Optional filtering parameters
   * @returns List of miner addresses
   */
  async getMinerAddresses(options?: { 
    minHashrate?: number;
    activeOnly?: boolean;
    excludeAddresses?: string[];
  }) {
    try {
      const miners = await this.getMiners();
      
      // Filter miners based on options
      let filteredMiners = miners;
      
      if (options?.minHashrate !== undefined) {
        const minHashrateValue = options.minHashrate;
        filteredMiners = filteredMiners.filter((miner: any) => 
          miner.hashrate >= minHashrateValue
        );
      }
      
      if (options?.activeOnly) {
        filteredMiners = filteredMiners.filter((miner: any) => 
          miner.active === true
        );
      }
      
      // Extract addresses
      let addresses = filteredMiners.map((miner: any) => miner.address);
      
      // Exclude specified addresses
      if (options?.excludeAddresses && options.excludeAddresses.length > 0) {
        addresses = addresses.filter((address: string) => 
          !options.excludeAddresses?.includes(address)
        );
      }
      
      // Remove duplicates
      return [...new Set(addresses)];
    } catch (error) {
      console.error('Failed to get miner addresses', error);
      throw error;
    }
  }

  /**
   * Get mining pool stats
   * @returns Pool statistics
   */
  async getPoolStats() {
    try {
      const response = await this.client.get('/stats');
      return response.data;
    } catch (error) {
      console.error('Failed to get pool stats', error);
      throw error;
    }
  }
}

export default new MiningPoolApi(); 