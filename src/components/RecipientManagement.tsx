
import { useState } from 'react';
import { useAirdrop } from '@/context/AirdropContext';
import PixelatedContainer from './PixelatedContainer';
import PixelatedButton from './PixelatedButton';
import { UserPlus, Trash2, Upload, Globe } from 'lucide-react';
import { toast } from 'sonner';

const RecipientManagement = () => {
  const { recipients, addRecipient, removeRecipient, importRecipients, importRecipientsFromApi } = useAirdrop();
  const [newAddress, setNewAddress] = useState('');
  const [newName, setNewName] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [apiAddressField, setApiAddressField] = useState('address');
  const [isImportingApi, setIsImportingApi] = useState(false);
  
  const handleAddRecipient = () => {
    if (!newAddress.trim()) {
      toast.error('Please enter a valid address');
      return;
    }
    
    // In a real implementation, validate the address format
    addRecipient(newAddress.trim(), newName.trim() || undefined);
    setNewAddress('');
    setNewName('');
    toast.success('Recipient added successfully');
  };
  
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        // Parse CSV or JSON
        // This is a simplified implementation - in a real app, add more robust parsing
        const lines = content.split('\n');
        const newRecipients = lines
          .filter(line => line.trim())
          .map(line => {
            const parts = line.split(',');
            return {
              id: Date.now() + Math.random().toString(),
              address: parts[0].trim(),
              name: parts[1]?.trim() || undefined
            };
          });
        
        importRecipients(newRecipients);
        toast.success(`${newRecipients.length} recipients imported`);
      } catch (error) {
        console.error('Import error:', error);
        toast.error('Failed to import recipients. Check file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleApiImport = async () => {
    if (!apiUrl) {
      toast.error('Please enter an API URL');
      return;
    }

    setIsImportingApi(true);
    try {
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
      const success = await importRecipientsFromApi(
        'http://5.78.102.130:8000/sigscore/miners/bonus', 
        'address'
      );
      if (success) {
        toast.success('Sigmanauts miners imported successfully');
      }
    } catch (error) {
      console.error('Sigmanauts import error:', error);
      toast.error('Failed to import Sigmanauts miners');
    } finally {
      setIsImportingApi(false);
    }
  };
  
  return (
    <PixelatedContainer className="mb-6">
      <h2 className="text-xl font-bold mb-4 text-deepsea-bright">Manage Recipients</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-bold mb-2">Recipient Address</label>
          <input
            type="text"
            className="w-full bg-deepsea-dark border border-deepsea-medium p-2 text-white"
            placeholder="Enter Ergo address"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
          />
        </div>
        
        <div>
          <label className="block text-sm font-bold mb-2">Name (Optional)</label>
          <input
            type="text"
            className="w-full bg-deepsea-dark border border-deepsea-medium p-2 text-white"
            placeholder="Label for this address"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-6">
        <PixelatedButton onClick={handleAddRecipient} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Add Recipient
        </PixelatedButton>
        
        <div className="relative">
          <input
            type="file"
            id="file-upload"
            className="absolute inset-0 opacity-0 cursor-pointer"
            accept=".csv,.txt,.json"
            onChange={handleImport}
          />
          <PixelatedButton variant="outline" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import CSV/JSON
          </PixelatedButton>
        </div>
      </div>

      {/* API Import Section */}
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
      
      <div className="border border-deepsea-medium bg-deepsea-dark/50">
        <div className="grid grid-cols-12 p-3 border-b border-deepsea-medium font-bold">
          <div className="col-span-1">#</div>
          <div className="col-span-7">Address</div>
          <div className="col-span-3">Name</div>
          <div className="col-span-1"></div>
        </div>
        
        <div className="max-h-60 overflow-y-auto">
          {recipients.length === 0 ? (
            <div className="text-center py-6 text-deepsea-bright/60">
              No recipients added yet.
            </div>
          ) : (
            recipients.map((recipient, index) => (
              <div 
                key={recipient.id} 
                className="grid grid-cols-12 p-3 border-b border-deepsea-medium/30 hover:bg-deepsea-medium/20"
              >
                <div className="col-span-1">{index + 1}</div>
                <div className="col-span-7 truncate">{recipient.address}</div>
                <div className="col-span-3">{recipient.name || '-'}</div>
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => removeRecipient(recipient.id)}
                    className="text-red-500 hover:text-red-400"
                    aria-label="Remove recipient"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="mt-4 text-right text-sm">
        Total Recipients: <span className="font-bold">{recipients.length}</span>
      </div>
    </PixelatedContainer>
  );
};

export default RecipientManagement;
