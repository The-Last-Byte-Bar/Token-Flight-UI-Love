
import axios, { AxiosInstance } from 'axios';
import { env } from '../../config/env';

class ErgoPlatformApi {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: env.ergoPlatformApiUrl,
      timeout: 10000
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          console.error(
            `API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
          );
        } else if (error.request) {
          console.error('API Error: No response received', error.request);
        } else {
          console.error('API Error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get box by token ID
   * @param tokenId Token ID
   * @returns Box data
   */
  async getBoxByTokenId(tokenId: string) {
    try {
      // Use /boxes/byTokenId/{tokenId} to get boxes containing the token
      const response = await this.client.get(`/boxes/byTokenId/${tokenId}`);
      
      // The endpoint returns an array of boxes, take the first one that contains the token as an asset
      const boxes = response.data.items || [];
      
      if (boxes.length === 0) {
        throw new Error(`No boxes found for token ID: ${tokenId}`);
      }
      
      // Find the box where this token was minted (it will have the NFT metadata)
      const boxWithToken = boxes.find((box: any) => 
        box.assets && box.assets.some((asset: any) => 
          asset.tokenId === tokenId && asset.amount === 1
        )
      );
      
      return boxWithToken || boxes[0];
    } catch (error) {
      console.error(`Failed to get box for token ID: ${tokenId}`, error);
      throw error;
    }
  }

  /**
   * Get address balance
   * @param address Ergo address
   * @returns Address balance data
   */
  async getAddressBalance(address: string) {
    try {
      const response = await this.client.get(`/addresses/${address}/balance/confirmed`);
      return response.data;
    } catch (error) {
      console.error(`Failed to get balance for address: ${address}`, error);
      throw error;
    }
  }

  /**
   * Get tokens for address
   * @param address Ergo address
   * @returns List of tokens held by the address
   */
  async getAddressTokens(address: string) {
    try {
      const response = await this.client.get(`/addresses/${address}/tokens`);
      return response.data;
    } catch (error) {
      console.error(`Failed to get tokens for address: ${address}`, error);
      throw error;
    }
  }

  /**
   * Broadcast signed transaction
   * @param signedTx Signed transaction
   * @returns Transaction ID
   */
  async broadcastTransaction(signedTx: string) {
    try {
      const response = await this.client.post('/mempool/transactions/submit', signedTx);
      return response.data;
    } catch (error) {
      console.error('Failed to broadcast transaction', error);
      throw error;
    }
  }
}

export default new ErgoPlatformApi();
