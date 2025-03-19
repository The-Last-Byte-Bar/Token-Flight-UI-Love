import { useState } from 'react';
import { useAirdrop } from '@/context/AirdropContext';
import PixelatedButton from '../PixelatedButton';
import { Globe } from 'lucide-react';
import { toast } from 'sonner';

const ApiImportForm = () => {
  const { importRecipientsFromApi } = useAirdrop();
  const [apiUrl, setApiUrl] = useState('');
  const [apiAddressField, setApiAddressField] = useState('address');
  const [isImportingApi, setIsImportingApi] = useState(false);
  
  const handleApiImport = async () => {
    if (!apiUrl) {
      toast.error('Please enter an API URL');
      return;
    }

    setIsImportingApi(true);
    try {
      console.log('Attempting to import from API:', apiUrl);
      console.log('Using address field:', apiAddressField);
      
      const success = await importRecipientsFromApi(apiUrl, apiAddressField);
      if (success) {
        toast.success('Recipients imported from API successfully');
        setApiUrl('');
      }
    } catch (error) {
      console.error('API import error:', error);
      toast.error('Failed to import recipients from API');
    } finally {
      setIsImportingApi(false);
    }
  };

  const handleSigmanautsImport = async () => {
    setIsImportingApi(true);
    try {
      console.log('Attempting to import Sigmanauts miners...');
      
      // Use our proxy endpoint with proper query parameter handling
      const success = await importRecipientsFromApi(
        '/api/sigmanauts-proxy', 
        'address',
        true // isSigmanauts flag
      );
      
      if (success) {
        toast.success('Sigmanauts miners imported successfully');
      } else {
        console.log('Sigmanauts miners import returned false (no recipients found)');
        toast.warning('No Sigmanauts miners found. This could be because the API returned no data or is temporarily unavailable.');
      }
    } catch (error) {
      console.error('Sigmanauts import error:', error);
      toast.error('Failed to import Sigmanauts miners');
    } finally {
      setIsImportingApi(false);
    }
  };
  
  return (
    <div className="border border-deepsea-medium bg-deepsea-dark/50 p-4 mb-6">
      <h3 className="font-bold mb-3">Import from API</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-bold mb-2">API URL</label>
          <input
            type="text"
            className="w-full bg-deepsea-dark border border-deepsea-medium p-2 text-white"
            placeholder="https://api.example.com/users"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
          />
        </div>
        
        <div>
          <label className="block text-sm font-bold mb-2">Address Field</label>
          <input
            type="text"
            className="w-full bg-deepsea-dark border border-deepsea-medium p-2 text-white"
            placeholder="address"
            value={apiAddressField}
            onChange={(e) => setApiAddressField(e.target.value)}
          />
        </div>
        
        <div className="flex items-end">
          <PixelatedButton 
            onClick={handleApiImport} 
            disabled={isImportingApi}
            className="w-full flex items-center justify-center gap-2"
          >
            <Globe className="h-4 w-4" />
            {isImportingApi ? 'Importing...' : 'Import'}
          </PixelatedButton>
        </div>
      </div>
      
      <div className="flex justify-center">
        <PixelatedButton
          variant="outline"
          onClick={handleSigmanautsImport}
          disabled={isImportingApi}
          className="flex items-center gap-2"
        >
          <Globe className="h-4 w-4" />
          Import Sigmanauts Mining Pool
        </PixelatedButton>
      </div>
    </div>
  );
};

export default ApiImportForm;
