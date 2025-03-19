import { Recipient, NFTDistribution } from '@/types/index';
import { toast } from 'sonner';
import { createDebugLogger } from '@/hooks/useDebugLog';
import { updateNFTDistributionMappings } from './nftHandlers';

const debug = createDebugLogger('RecipientHandlers');

export const handleAddRecipient = (
  setRecipients: React.Dispatch<React.SetStateAction<Recipient[]>>,
  address: string,
  name?: string
) => {
  debug('Adding new recipient:', { address, name });
  
  const newRecipient: Recipient = {
    id: `recipient-${Date.now()}`,
    address,
    name: name || `Recipient ${address.substring(0, 8)}...`
  };
  
  setRecipients(prev => [...prev, newRecipient]);
};

export const handleRemoveRecipient = (
  setRecipients: React.Dispatch<React.SetStateAction<Recipient[]>>,
  id: string
) => {
  debug('Removing recipient:', { id });
  setRecipients(prev => prev.filter(r => r.id !== id));
};

export const handleImportRecipients = (
  setRecipients: React.Dispatch<React.SetStateAction<Recipient[]>>,
  newRecipients: Recipient[]
) => {
  debug('Importing recipients:', { count: newRecipients.length });
  setRecipients(prev => [...prev, ...newRecipients]);
};

export const handleImportRecipientsFromApi = async (
  setRecipients: React.Dispatch<React.SetStateAction<Recipient[]>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  url: string,
  addressField: string
): Promise<boolean> => {
  setLoading(true);
  debug('Importing recipients from API:', { url, addressField });
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    let addresses: string[] = [];
    
    if (Array.isArray(data)) {
      // Handle array of objects
      addresses = data.map(item => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item !== null) {
          // For mining pool API, check miner field first
          if (item.miner) return item.miner;
          return item[addressField] || item.address || '';
        }
        return '';
      }).filter(addr => addr !== '');
    } else if (typeof data === 'object' && data !== null) {
      // Handle single object or object with array property
      if (Array.isArray(data.miners)) {
        // Special handling for mining pool API
        addresses = data.miners.map((miner: any) => miner.address || miner.miner || '').filter(Boolean);
      } else if (Array.isArray(data[addressField])) {
        addresses = data[addressField];
      } else if (data[addressField]) {
        addresses = [data[addressField]];
      } else if (data.address) {
        addresses = [data.address];
      }
    }
    
    // Remove duplicates and empty values
    addresses = [...new Set(addresses)].filter(addr => addr !== '');
    
    if (addresses.length === 0) {
      console.log('No valid addresses found in API response');
      return false;
    }
    
    console.log(`Found ${addresses.length} unique addresses`);
    
    // Create recipients from addresses
    const newRecipients = addresses.map((address, index) => ({
      id: `api-${Date.now()}-${index}`,
      address,
      name: `Recipient ${address.substring(0, 8)}...`,
      amount: 0
    }));
    
    // Update recipients state
    setRecipients(prev => [...prev, ...newRecipients]);
    
    return true;
  } catch (error) {
    console.error('Error importing recipients from API:', error);
    throw error;
  } finally {
    setLoading(false);
  }
};
