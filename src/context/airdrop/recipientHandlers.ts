import { Recipient } from '@/types/index';
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
    console.log(`Importing recipients from API: ${url} using address field: ${addressField}`);
    
    // Handle sigmanauts specifically or use general proxy
    let finalUrl;
    if (url.includes('5.78.102.130')) {
      finalUrl = `/api/sigmanauts-proxy`;
    } else if (url.includes('/api/sigmanauts-proxy')) {
      finalUrl = url;
    } else if (url.includes('/api/mining-pool/sigmanauts-proxy')) {
      // Handle wrong path from previous implementation
      finalUrl = `/api/sigmanauts-proxy`;
      console.log('Corrected API path from old format to new format');
    } else {
      finalUrl = url;
    }

    console.log(`Using final URL: ${finalUrl}`);
    
    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      // Log the actual response content for debugging
      const text = await response.text();
      console.error('Error response content:', text);
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    // Try to parse the response as JSON, with better error handling
    let data;
    try {
      const text = await response.text();
      console.log('Raw API response:', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      throw new Error('API returned invalid JSON');
    }
    
    console.log('API response received:', typeof data, Array.isArray(data) ? data.length : 'not array', data);
    
    let apiRecipients: Recipient[] = [];
    
    if (Array.isArray(data)) {
      console.log(`Processing array response with ${data.length} items`);
      apiRecipients = data
        .filter(item => item && item[addressField])
        .map((item, index) => ({
          id: `api-${Date.now()}-${index}`,
          address: item[addressField],
          name: item.name || `API Recipient ${index + 1}`,
        }));
    } else if (typeof data === 'object' && data !== null) {
      console.log('Processing object response, looking for arrays in properties');
      const possibleArrays = Object.values(data).filter(val => Array.isArray(val));
      
      if (possibleArrays.length > 0) {
        const firstArray = possibleArrays[0];
        console.log(`Found array with ${firstArray.length} items`);
        
        apiRecipients = firstArray
          .filter((item: any) => item && item[addressField])
          .map((item: any, index: number) => ({
            id: `api-${Date.now()}-${index}`,
            address: item[addressField],
            name: item.name || `API Recipient ${index + 1}`,
          }));
      } else {
        console.log('No arrays found in response properties');
      }
    }
    
    console.log(`Processed ${apiRecipients.length} recipients from API`);
    
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
