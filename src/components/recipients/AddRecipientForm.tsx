
import { useState } from 'react';
import { useAirdrop } from '@/context/AirdropContext';
import PixelatedButton from '../PixelatedButton';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';

const AddRecipientForm = () => {
  const { addRecipient } = useAirdrop();
  const [newAddress, setNewAddress] = useState('');
  const [newName, setNewName] = useState('');
  
  const handleAddRecipient = () => {
    if (!newAddress.trim()) {
      toast.error('Please enter a valid address');
      return;
    }
    
    addRecipient(newAddress.trim(), newName.trim() || undefined);
    setNewAddress('');
    setNewName('');
    toast.success('Recipient added successfully');
  };
  
  return (
    <div className="mb-6">
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
      </div>
    </div>
  );
};

export default AddRecipientForm;
