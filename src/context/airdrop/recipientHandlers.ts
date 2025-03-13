
import { Recipient } from '@/types';
import { toast } from 'sonner';
import { createDebugLogger } from '@/hooks/useDebugLog';

const debug = createDebugLogger('AirdropRecipientHandlers');

export const handleAddRecipient = (
  setRecipients: React.Dispatch<React.SetStateAction<Recipient[]>>,
  address: string, 
  name?: string
) => {
  const newRecipient: Recipient = {
    id: Date.now().toString(),
    address,
    name
  };
  
  setRecipients(prev => [...prev, newRecipient]);
};

export const handleRemoveRecipient = (
  setRecipients: React.Dispatch<React.SetStateAction<Recipient[]>>,
  id: string
) => {
  setRecipients(prev => prev.filter(r => r.id !== id));
};

export const handleImportRecipients = (
  setRecipients: React.Dispatch<React.SetStateAction<Recipient[]>>,
  newRecipients: Recipient[]
) => {
  setRecipients(prev => [...prev, ...newRecipients]);
};

export const handleImportRecipientsFromApi = async (
  setRecipients: React.Dispatch<React.SetStateAction<Recipient[]>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  url: string, 
  addressField: string
): Promise<boolean> => {
  setLoading(true);
  
  try {
    const finalUrl = url.includes('5.78.102.130') 
      ? `/api/sigmanauts-proxy`
      : url;

    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    let apiRecipients: Recipient[] = [];
    
    if (Array.isArray(data)) {
      apiRecipients = data
        .filter(item => item && item[addressField])
        .map((item, index) => ({
          id: `api-${Date.now()}-${index}`,
          address: item[addressField],
          name: item.name || `API Recipient ${index + 1}`,
        }));
    } else if (typeof data === 'object' && data !== null) {
      const possibleArrays = Object.values(data).filter(val => Array.isArray(val));
      
      if (possibleArrays.length > 0) {
        apiRecipients = possibleArrays[0]
          .filter((item: any) => item && item[addressField])
          .map((item: any, index: number) => ({
            id: `api-${Date.now()}-${index}`,
            address: item[addressField],
            name: item.name || `API Recipient ${index + 1}`,
          }));
      }
    }
    
    if (apiRecipients.length === 0) {
      toast.error(`No valid recipient addresses found in the API response`);
      return false;
    }
    
    console.log('First few imported recipients:', apiRecipients.slice(0, 3));
    
    handleImportRecipients(setRecipients, apiRecipients);
    return true;
  } catch (error) {
    console.error('API import error:', error);
    toast.error(`Failed to import from API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  } finally {
    setLoading(false);
  }
};
