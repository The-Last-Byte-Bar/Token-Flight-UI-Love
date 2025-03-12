import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const env = {
  // Server Configuration
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',

  // API Configuration
  ergoPlatformApiUrl: process.env.ERGO_PLATFORM_API_URL || 'https://api.ergoplatform.com/api/v1',
  miningPoolApiUrl: process.env.MINING_POOL_API_URL || '',

  // Cache Configuration
  cacheEnabled: process.env.CACHE_ENABLED === 'true',
  cacheTTL: parseInt(process.env.CACHE_TTL || '300', 10)
}; 