
import { useAirdrop } from '@/context/AirdropContext';
import { Recipient } from '@/types';
import { Trash2 } from 'lucide-react';

interface RecipientListProps {
  recipients: Recipient[];
}

const RecipientList = ({ recipients }: RecipientListProps) => {
  const { removeRecipient } = useAirdrop();
  
  return (
    <div>
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
    </div>
  );
};

export default RecipientList;
